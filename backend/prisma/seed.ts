/**
 * Seed démo DonyPay — parcours complet sans Mobile Money réel.
 *
 * Idempotent : réutilise les emails `*@donypay.demo`.
 *
 * Usage :
 *   npm run db:seed
 *   # ou staging boot : SEED_DEMO=true
 */
import {
  DisputeReason,
  DisputeStatus,
  DisputeSubjectType,
  InstallmentStatus,
  KycDocumentType,
  KycStatus,
  LedgerAccountKind,
  LedgerEntryType,
  PaymentLinkStatus,
  Prisma,
  PrismaClient,
  SavingsGoalStatus,
  SavingsMode,
  UserRole,
  UserType,
} from '@prisma/client';
import { createHash, randomUUID } from 'crypto';

const prisma = new PrismaClient();

const DEMO_DOMAIN = 'donypay.demo';

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function money(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(2);
}

async function latestBalance(
  tx: Prisma.TransactionClient,
  accountId: string,
): Promise<Prisma.Decimal> {
  const last = await tx.ledgerEntry.findFirst({
    where: { accountId },
    orderBy: { sequence: 'desc' },
    select: { balanceAfter: true },
  });
  return last?.balanceAfter ?? new Prisma.Decimal(0);
}

async function ensureClearing(tx: Prisma.TransactionClient) {
  const existing = await tx.ledgerAccount.findFirst({
    where: { kind: LedgerAccountKind.clearing },
  });
  if (existing) return existing;
  return tx.ledgerAccount.create({
    data: { kind: LedgerAccountKind.clearing, userId: null },
  });
}

/** Crédit épargne + débit clearing (partie double), sans CinetPay. */
async function demoDeposit(
  accountId: string,
  amount: number,
  metadata: Record<string, unknown>,
) {
  const decimalAmount = money(amount);
  await prisma.$transaction(async (tx) => {
    const clearing = await ensureClearing(tx);
    const savingsBalance = await latestBalance(tx, accountId);
    const clearingBalance = await latestBalance(tx, clearing.id);

    await tx.ledgerEntry.create({
      data: {
        accountId,
        type: LedgerEntryType.credit,
        amount: decimalAmount,
        balanceAfter: savingsBalance.add(decimalAmount),
        metadata: {
          ...metadata,
          operation: 'deposit',
          demo: true,
          counterpartAccountId: clearing.id,
        },
      },
    });

    await tx.ledgerEntry.create({
      data: {
        accountId: clearing.id,
        type: LedgerEntryType.debit,
        amount: decimalAmount,
        balanceAfter: clearingBalance.sub(decimalAmount),
        metadata: {
          ...metadata,
          operation: 'deposit',
          demo: true,
          counterpartAccountId: accountId,
        },
      },
    });
  });
}

async function upsertUser(input: {
  email: string;
  role?: UserRole;
  type?: UserType;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  siret?: string;
  phone?: string;
  kycStatus?: KycStatus;
  kycRejectReason?: string | null;
}) {
  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      role: input.role ?? UserRole.user,
      type: input.type ?? UserType.individual,
      firstName: input.firstName,
      lastName: input.lastName,
      companyName: input.companyName,
      siret: input.siret,
      phone: input.phone,
      kycStatus: input.kycStatus ?? KycStatus.pending,
      kycRejectReason: input.kycRejectReason ?? null,
      kycReviewedAt:
        input.kycStatus && input.kycStatus !== KycStatus.pending
          ? new Date()
          : null,
    },
    create: {
      email: input.email,
      role: input.role ?? UserRole.user,
      type: input.type ?? UserType.individual,
      firstName: input.firstName,
      lastName: input.lastName,
      companyName: input.companyName,
      siret: input.siret,
      phone: input.phone,
      kycStatus: input.kycStatus ?? KycStatus.pending,
      kycRejectReason: input.kycRejectReason ?? null,
      kycReviewedAt:
        input.kycStatus && input.kycStatus !== KycStatus.pending
          ? new Date()
          : null,
    },
  });
}

async function ensureKycDocs(
  userId: string,
  types: KycDocumentType[] = [
    KycDocumentType.identity_document,
    KycDocumentType.proof_of_address,
  ],
) {
  for (const type of types) {
    const existing = await prisma.kycDocument.findFirst({
      where: { userId, type },
    });
    if (existing) continue;
    await prisma.kycDocument.create({
      data: {
        userId,
        type,
        storageKey: `demo/${userId}/${type}.jpg`,
        originalName: `${type}.jpg`,
        mimeType: 'image/jpeg',
        sizeBytes: 120_000,
      },
    });
  }
}

async function wipeDemoGraph() {
  const demoUsers = await prisma.user.findMany({
    where: { email: { endsWith: `@${DEMO_DOMAIN}` } },
    select: { id: true },
  });
  const ids = demoUsers.map((u) => u.id);
  if (ids.length === 0) return;

  const goals = await prisma.savingsGoal.findMany({
    where: { userId: { in: ids } },
    select: { id: true, ledgerAccountId: true, productId: true },
  });
  const goalIds = goals.map((g) => g.id);
  const productIds = [
    ...new Set(
      (
        await prisma.product.findMany({
          where: { shop: { sellerId: { in: ids } } },
          select: { id: true },
        })
      ).map((p) => p.id),
    ),
  ];
  const shopIds = (
    await prisma.shop.findMany({
      where: { sellerId: { in: ids } },
      select: { id: true },
    })
  ).map((s) => s.id);

  const installmentIds = goalIds.length
    ? (
        await prisma.savingsInstallment.findMany({
          where: { goalId: { in: goalIds } },
          select: { id: true },
        })
      ).map((i) => i.id)
    : [];

  await prisma.disputeRating.deleteMany({
    where: { OR: [{ userId: { in: ids } }, { dispute: { openedById: { in: ids } } }] },
  });
  await prisma.disputeAttachment.deleteMany({
    where: { OR: [{ uploadedById: { in: ids } }, { dispute: { openedById: { in: ids } } }] },
  });
  await prisma.disputeMessage.deleteMany({
    where: { OR: [{ authorId: { in: ids } }, { dispute: { openedById: { in: ids } } }] },
  });
  await prisma.dispute.deleteMany({
    where: { openedById: { in: ids } },
  });

  if (installmentIds.length) {
    await prisma.paymentLink.deleteMany({
      where: { installmentId: { in: installmentIds } },
    });
  }
  if (goalIds.length) {
    await prisma.savingsDeposit.deleteMany({ where: { goalId: { in: goalIds } } });
    await prisma.savingsInstallment.deleteMany({ where: { goalId: { in: goalIds } } });
    await prisma.savingsGoal.deleteMany({ where: { id: { in: goalIds } } });
  }

  await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
  await prisma.kycDocument.deleteMany({ where: { userId: { in: ids } } });
  await prisma.twoFactorChallenge.deleteMany({ where: { userId: { in: ids } } });

  if (productIds.length) {
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  }
  if (shopIds.length) {
    await prisma.shop.deleteMany({ where: { id: { in: shopIds } } });
  }

  const ledgerIds = [
    ...new Set(goals.map((g) => g.ledgerAccountId).filter(Boolean)),
  ];
  const userLedgers = await prisma.ledgerAccount.findMany({
    where: { userId: { in: ids } },
    select: { id: true },
  });
  const allLedgerIds = [...new Set([...ledgerIds, ...userLedgers.map((a) => a.id)])];

  if (allLedgerIds.length) {
    await prisma.mobileMoneyCollection.deleteMany({
      where: { accountId: { in: allLedgerIds } },
    });
    await prisma.ledgerEntry.deleteMany({
      where: { accountId: { in: allLedgerIds } },
    });
    await prisma.ledgerAccount.deleteMany({
      where: { id: { in: allLedgerIds } },
    });
  }

  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

async function main() {
  console.log('[seed] wiping previous @donypay.demo data…');
  await wipeDemoGraph();

  console.log('[seed] users…');
  const admin = await upsertUser({
    email: `admin@${DEMO_DOMAIN}`,
    role: UserRole.admin,
    type: UserType.company,
    companyName: 'DonyPay Ops',
    siret: '00000000000000',
    firstName: 'Admin',
    lastName: 'Demo',
    phone: '+2250700000001',
    kycStatus: KycStatus.verified,
  });

  const seller = await upsertUser({
    email: `vendeur@${DEMO_DOMAIN}`,
    firstName: 'Marie',
    lastName: 'Traoré',
    phone: '+2250700000010',
    kycStatus: KycStatus.verified,
  });

  const buyerReady = await upsertUser({
    email: `acheteur@${DEMO_DOMAIN}`,
    firstName: 'Awa',
    lastName: 'Koné',
    phone: '+2250700000020',
    kycStatus: KycStatus.verified,
  });
  await ensureKycDocs(buyerReady.id);

  const buyerPending = await upsertUser({
    email: `kyc-pending@${DEMO_DOMAIN}`,
    firstName: 'Kofi',
    lastName: 'Mensah',
    phone: '+2250700000021',
    kycStatus: KycStatus.pending,
  });
  await ensureKycDocs(buyerPending.id);

  const buyerRejected = await upsertUser({
    email: `kyc-rejected@${DEMO_DOMAIN}`,
    firstName: 'Fatou',
    lastName: 'Diallo',
    phone: '+2250700000022',
    kycStatus: KycStatus.rejected,
    kycRejectReason: 'Pièce illisible (seed démo)',
  });
  await ensureKycDocs(buyerRejected.id, [KycDocumentType.identity_document]);

  console.log('[seed] boutique + produits…');
  const shop = await prisma.shop.create({
    data: {
      sellerId: seller.id,
      name: 'Boutique Marie (démo)',
      description: 'Électronique & accessoires — données de démonstration',
    },
  });

  const products = await Promise.all(
    [
      { name: 'Écouteurs sans fil', price: 60_000 },
      { name: 'Smartphone X12', price: 180_000 },
      { name: 'Montre connectée', price: 90_000 },
    ].map(async (item) => {
      const id = randomUUID();
      return prisma.product.create({
        data: {
          id,
          shopId: shop.id,
          name: item.name,
          price: money(item.price),
          photoKey: null,
          qrPayload: `https://donypay.app/p/${shop.id}/${id}`,
          qrCodeKey: `${shop.id}/qr/${id}.png`,
        },
      });
    }),
  );

  const [earbuds, phone, watch] = products;

  console.log('[seed] plans d’épargne à différents stades…');

  // 1) Échéancier actif — 2/6 payées
  const ledgerActive = await prisma.ledgerAccount.create({
    data: { userId: buyerReady.id, kind: LedgerAccountKind.savings },
  });
  const installmentAmount = 30_000;
  const activeGoal = await prisma.savingsGoal.create({
    data: {
      userId: buyerReady.id,
      productId: phone.id,
      mode: SavingsMode.schedule,
      targetAmount: phone.price,
      savedAmount: money(installmentAmount * 2),
      status: SavingsGoalStatus.active,
      ledgerAccountId: ledgerActive.id,
      installments: {
        create: Array.from({ length: 6 }, (_, index) => ({
          sequence: index + 1,
          dueDate: daysFromNow((index + 1) * 30),
          amount: money(installmentAmount),
          status:
            index < 2 ? InstallmentStatus.paid : InstallmentStatus.pending,
          paidAt: index < 2 ? daysFromNow(-((2 - index) * 7)) : null,
          payerName: index < 2 ? 'Awa Koné' : null,
          payerPhone: index < 2 ? buyerReady.phone : null,
        })),
      },
    },
    include: { installments: { orderBy: { sequence: 'asc' } } },
  });
  await demoDeposit(ledgerActive.id, installmentAmount, {
    goalId: activeGoal.id,
    installmentId: activeGoal.installments[0].id,
  });
  await demoDeposit(ledgerActive.id, installmentAmount, {
    goalId: activeGoal.id,
    installmentId: activeGoal.installments[1].id,
  });
  await prisma.savingsDeposit.createMany({
    data: [
      {
        goalId: activeGoal.id,
        installmentId: activeGoal.installments[0].id,
        amount: money(installmentAmount),
      },
      {
        goalId: activeGoal.id,
        installmentId: activeGoal.installments[1].id,
        amount: money(installmentAmount),
      },
    ],
  });

  // Lien de paiement délégué sur la 3e échéance (sans Mobile Money)
  const token = createHash('sha256')
    .update(`demo-link-${activeGoal.installments[2].id}`)
    .digest('hex')
    .slice(0, 32);
  await prisma.paymentLink.create({
    data: {
      token,
      installmentId: activeGoal.installments[2].id,
      amount: money(installmentAmount),
      status: PaymentLinkStatus.pending,
      expiresAt: daysFromNow(2),
    },
  });

  // 2) Flexi actif — versements libres partiels
  const ledgerFlexi = await prisma.ledgerAccount.create({
    data: { userId: buyerReady.id, kind: LedgerAccountKind.savings },
  });
  const flexiGoal = await prisma.savingsGoal.create({
    data: {
      userId: buyerReady.id,
      productId: earbuds.id,
      mode: SavingsMode.flexi,
      targetAmount: earbuds.price,
      savedAmount: money(25_000),
      status: SavingsGoalStatus.active,
      ledgerAccountId: ledgerFlexi.id,
      flexiStartsAt: daysFromNow(-10),
      flexiEndsAt: daysFromNow(80),
    },
  });
  await demoDeposit(ledgerFlexi.id, 25_000, { goalId: flexiGoal.id });
  await prisma.savingsDeposit.create({
    data: {
      goalId: flexiGoal.id,
      amount: money(25_000),
    },
  });

  // 3) Prêt pour retrait — objectif atteint
  const ledgerReady = await prisma.ledgerAccount.create({
    data: { userId: buyerReady.id, kind: LedgerAccountKind.savings },
  });
  const readyGoal = await prisma.savingsGoal.create({
    data: {
      userId: buyerReady.id,
      productId: watch.id,
      mode: SavingsMode.schedule,
      targetAmount: watch.price,
      savedAmount: watch.price,
      status: SavingsGoalStatus.ready_for_withdrawal,
      ledgerAccountId: ledgerReady.id,
      readyAt: daysFromNow(-1),
      installments: {
        create: Array.from({ length: 3 }, (_, index) => ({
          sequence: index + 1,
          dueDate: daysFromNow(-60 + index * 20),
          amount: money(30_000),
          status: InstallmentStatus.paid,
          paidAt: daysFromNow(-50 + index * 20),
          payerName: index === 2 ? 'Tiers Démo' : 'Awa Koné',
          payerPhone: '+2250700000099',
        })),
      },
    },
  });
  await demoDeposit(ledgerReady.id, 90_000, { goalId: readyGoal.id });
  await prisma.savingsDeposit.create({
    data: { goalId: readyGoal.id, amount: money(90_000) },
  });
  await prisma.notification.create({
    data: {
      userId: seller.id,
      type: 'goal_reached',
      title: 'Objectif d’épargne atteint',
      body: `L’épargne pour « ${watch.name} » est prête pour retrait.`,
      metadata: {
        goalId: readyGoal.id,
        productId: watch.id,
        buyerId: buyerReady.id,
        demo: true,
      },
    },
  });

  // 4) Complété (remise déjà faite)
  const ledgerDone = await prisma.ledgerAccount.create({
    data: { userId: buyerReady.id, kind: LedgerAccountKind.savings },
  });
  await prisma.savingsGoal.create({
    data: {
      userId: buyerReady.id,
      productId: earbuds.id,
      mode: SavingsMode.flexi,
      targetAmount: earbuds.price,
      savedAmount: money(0),
      status: SavingsGoalStatus.completed,
      ledgerAccountId: ledgerDone.id,
      flexiStartsAt: daysFromNow(-120),
      flexiEndsAt: daysFromNow(-30),
      readyAt: daysFromNow(-35),
    },
  });

  // 5) Nouveau plan tout juste créé (acheteur KYC pending — pour revue admin)
  const ledgerNew = await prisma.ledgerAccount.create({
    data: { userId: buyerPending.id, kind: LedgerAccountKind.savings },
  });
  await prisma.savingsGoal.create({
    data: {
      userId: buyerPending.id,
      productId: earbuds.id,
      mode: SavingsMode.schedule,
      targetAmount: earbuds.price,
      savedAmount: money(0),
      status: SavingsGoalStatus.active,
      ledgerAccountId: ledgerNew.id,
      installments: {
        create: Array.from({ length: 3 }, (_, index) => ({
          sequence: index + 1,
          dueDate: daysFromNow((index + 1) * 30),
          amount: money(20_000),
          status: InstallmentStatus.pending,
        })),
      },
    },
  });

  console.log('[seed] litige ouvert…');
  const dispute = await prisma.dispute.create({
    data: {
      openedById: buyerReady.id,
      reason: DisputeReason.non_conforming_product,
      status: DisputeStatus.open,
      subjectType: DisputeSubjectType.savings_goal,
      savingsGoalId: activeGoal.id,
      title: 'Produit différent de la fiche (démo)',
      description:
        'Seed démo — réclamation pour tester la console admin litiges.',
      messages: {
        create: {
          authorId: buyerReady.id,
          body: 'Bonjour, la couleur ne correspond pas à l’annonce.',
        },
      },
    },
  });

  await prisma.notification.create({
    data: {
      userId: buyerReady.id,
      type: 'deposit_received',
      title: 'Versement reçu',
      body: 'Versement démo enregistré sur votre plan Smartphone X12.',
      metadata: { goalId: activeGoal.id, demo: true },
    },
  });

  console.log('[seed] OK');
  console.log(
    JSON.stringify(
      {
        admin: admin.email,
        seller: seller.email,
        buyerVerified: buyerReady.email,
        buyerKycPending: buyerPending.email,
        buyerKycRejected: buyerRejected.email,
        shopId: shop.id,
        products: products.map((p) => ({ id: p.id, name: p.name, price: p.price })),
        goals: {
          scheduleActive: activeGoal.id,
          flexiPartial: flexiGoal.id,
          readyForWithdrawal: readyGoal.id,
        },
        paymentLinkToken: token,
        paymentLinkPublicPath: `/api/payment-links/public/${token}`,
        disputeId: dispute.id,
        note: 'Parcours démo sans CinetPay / Mobile Money réel',
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error('[seed] FAILED', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
