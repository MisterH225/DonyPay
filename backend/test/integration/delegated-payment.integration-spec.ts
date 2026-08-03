import { Test, TestingModule } from '@nestjs/testing';
import {
  InstallmentStatus,
  PaymentLinkStatus,
  SavingsGoalStatus,
  SavingsMode,
  UserType,
} from '@prisma/client';
import { AppModule } from '../../src/app.module';
import { ProductsService } from '../../src/modules/catalog/products.service';
import { ShopsService } from '../../src/modules/catalog/shops.service';
import { UsersService } from '../../src/modules/identity/users.service';
import { LEDGER_PORT, type LedgerPort } from '../../src/modules/ledger-adapter';
import { PaymentLinksService } from '../../src/modules/payment-links/payment-links.service';
import { SavingsGoalsService } from '../../src/modules/savings-engine/savings-goals.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  disconnectIntegrationPrisma,
  getIntegrationPrisma,
  resetIntegrationDatabase,
} from './db';

/**
 * Non-régression — paiement délégué complet :
 * lien généré → payé par un tiers → échéance clôturée → notification vendeur
 * (objectif atteint via l'unique échéance = prix produit).
 */
describe('Delegated payment scenario (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let users: UsersService;
  let shops: ShopsService;
  let products: ProductsService;
  let savingsGoals: SavingsGoalsService;
  let paymentLinks: PaymentLinksService;
  let ledger: LedgerPort;
  let dbAvailable = false;

  beforeAll(async () => {
    const raw = await getIntegrationPrisma();
    dbAvailable = Boolean(raw);
    if (!dbAvailable) return;

    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    users = moduleRef.get(UsersService);
    shops = moduleRef.get(ShopsService);
    products = moduleRef.get(ProductsService);
    savingsGoals = moduleRef.get(SavingsGoalsService);
    paymentLinks = moduleRef.get(PaymentLinksService);
    ledger = moduleRef.get<LedgerPort>(LEDGER_PORT);
  });

  afterAll(async () => {
    if (moduleRef) await moduleRef.close();
    await disconnectIntegrationPrisma();
  });

  beforeEach(async () => {
    if (!dbAvailable) return;
    await resetIntegrationDatabase(prisma);
  });

  it('lien → paiement tiers → échéance payée → notif vendeur + solde cohérent', async () => {
    if (!dbAvailable) {
      return console.warn('SKIP: DATABASE_URL injoignable');
    }

    const seller = await users.create({
      email: `seller-${Date.now()}@donypay.test`,
      phone: '+2250700111111',
      type: UserType.individual,
      firstName: 'Awa',
      lastName: 'Kouassi',
    });

    const buyer = await users.create({
      email: `buyer-${Date.now()}@donypay.test`,
      phone: '+2250700222222',
      type: UserType.individual,
      firstName: 'Yao',
      lastName: 'Koné',
    });

    const shop = await shops.create({
      sellerId: seller.id,
      name: 'Boutique Intégration',
      description: 'Test paiement délégué',
    });

    const product = await products.create(shop.id, {
      name: 'Phone X',
      price: 10000,
    });

    const goal = await savingsGoals.create({
      userId: buyer.id,
      productId: product.id,
      mode: SavingsMode.schedule,
      installments: [
        {
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          amount: 10000,
        },
      ],
    });

    expect(goal.installments).toHaveLength(1);
    const installment = goal.installments[0];
    expect(installment.status).toBe(InstallmentStatus.pending);

    // 1) Lien de paiement généré
    const link = await paymentLinks.create({
      installmentId: installment.id,
    });
    expect(link.status).toBe(PaymentLinkStatus.pending);
    expect(link.publicUrl).toContain(link.token);
    expect(Number(link.amount)).toBe(10000);

    const publicPage = await paymentLinks.getPublicPage(link.token);
    expect(publicPage.requiresAccount).toBe(false);
    expect(publicPage.productName).toBe('Phone X');

    // 2) Payé par un tiers (téléphone ≠ acheteur)
    const thirdPartyPhone = '+2250700999999';
    expect(thirdPartyPhone).not.toBe(buyer.phone);

    const callback = await paymentLinks.handleMobileMoneyCallback(link.token, {
      status: 'success',
      payerName: 'Tiers Payeur',
      payerPhone: thirdPartyPhone,
      payerOperator: 'OM',
      providerRef: `int-test-${Date.now()}`,
    });

    expect(callback.status).toBe(PaymentLinkStatus.paid);
    expect(callback.payer?.phone).toBe(thirdPartyPhone);

    // 3) Échéance clôturée
    const paidInstallment = await prisma.savingsInstallment.findUnique({
      where: { id: installment.id },
    });
    expect(paidInstallment?.status).toBe(InstallmentStatus.paid);
    expect(paidInstallment?.paidAt).toBeTruthy();
    expect(paidInstallment?.payerPhone).toBe(thirdPartyPhone);
    expect(paidInstallment?.payerName).toBe('Tiers Payeur');

    const paidLink = await prisma.paymentLink.findUnique({
      where: { id: link.id },
    });
    expect(paidLink?.status).toBe(PaymentLinkStatus.paid);
    expect(paidLink?.usedAt).toBeTruthy();

    // Objectif atteint (1 échéance = prix) → prêt pour retrait
    const updatedGoal = await savingsGoals.findById(goal.id);
    expect(updatedGoal.status).toBe(SavingsGoalStatus.ready_for_withdrawal);
    expect(Number(updatedGoal.savedAmount)).toBe(10000);

    // 4) Notification vendeur
    const sellerNotifs = await prisma.notification.findMany({
      where: { userId: seller.id },
      orderBy: { createdAt: 'desc' },
    });
    expect(sellerNotifs.length).toBeGreaterThanOrEqual(1);
    expect(sellerNotifs[0].type).toBe('savings.ready_for_withdrawal');
    expect(sellerNotifs[0].title).toMatch(/atteint/i);

    // Solde ledger cohérent avec le versement
    const balance = await ledger.getBalance(goal.ledgerAccountId);
    expect(balance).toBeCloseTo(10000, 2);

    const entries = await prisma.ledgerEntry.findMany({
      where: { accountId: goal.ledgerAccountId },
    });
    const signedSum = entries.reduce((acc, entry) => {
      const amount = Number(entry.amount.toString());
      return entry.type === 'credit' ? acc + amount : acc - amount;
    }, 0);
    expect(signedSum).toBeCloseTo(balance, 2);
  });
});
