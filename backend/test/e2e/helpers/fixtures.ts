import { SavingsMode } from '@prisma/client';
import { ProductsService } from '../../../src/modules/catalog/products.service';
import { ShopsService } from '../../../src/modules/catalog/shops.service';
import { UsersService } from '../../../src/modules/identity/users.service';
import { SavingsGoalsService } from '../../../src/modules/savings-engine/savings-goals.service';
import {
  authHeader,
  createAuthenticatedUser,
  type E2eUserSession,
} from './auth';
import type { E2eContext } from './bootstrap';

export type GoalFixture = {
  seller: E2eUserSession;
  buyer: E2eUserSession;
  shopId: string;
  productId: string;
  goalId: string;
  ledgerAccountId: string;
  targetAmount: number;
};

/**
 * Crée vendeur + boutique + produit + acheteur + goal flexi via services DI.
 */
export async function createFlexiGoalFixture(
  ctx: E2eContext,
  options?: { targetAmount?: number; savedViaDeposit?: number },
): Promise<GoalFixture> {
  const targetAmount = options?.targetAmount ?? 100;
  const users = ctx.moduleRef.get(UsersService);
  const shops = ctx.moduleRef.get(ShopsService);
  const products = ctx.moduleRef.get(ProductsService);
  const savingsGoals = ctx.moduleRef.get(SavingsGoalsService);

  const seller = await createAuthenticatedUser(ctx.app, {
    firstName: 'Seller',
    phone: `+2250701${String(Date.now()).slice(-6)}`,
  });
  const buyer = await createAuthenticatedUser(ctx.app, {
    firstName: 'Buyer',
    phone: `+2250702${String(Date.now()).slice(-6)}`,
  });

  // ShopsService.create expects sellerId — JWT path uses CurrentUser;
  // here we call the service directly for fixture speed.
  const shop = await shops.create({
    sellerId: seller.userId,
    name: 'Boutique E2E',
    description: 'Fixture',
  });

  const product = await products.create(shop.id, {
    name: 'Produit E2E',
    price: targetAmount,
  });

  const goal = await savingsGoals.create({
    userId: buyer.userId,
    productId: product.id,
    mode: SavingsMode.flexi,
    flexiStartsAt: new Date(Date.now() - 60_000).toISOString(),
    flexiEndsAt: new Date(Date.now() + 86_400_000).toISOString(),
  });

  if (options?.savedViaDeposit && options.savedViaDeposit > 0) {
    await savingsGoals.recordDeposit(goal.id, {
      amount: options.savedViaDeposit,
    });
  }

  // Ensure seller user exists as owner of shop (already via shops.create).
  // Touch users to keep typing happy if tree-shaken.
  await users.findById(seller.userId);

  return {
    seller,
    buyer,
    shopId: shop.id,
    productId: product.id,
    goalId: goal.id,
    ledgerAccountId: goal.ledgerAccountId,
    targetAmount,
  };
}

export async function createScheduleGoalFixture(
  ctx: E2eContext,
  options?: { targetAmount?: number; installmentCount?: number },
) {
  const targetAmount = options?.targetAmount ?? 100;
  const installmentCount = options?.installmentCount ?? 2;
  const part = targetAmount / installmentCount;

  const shops = ctx.moduleRef.get(ShopsService);
  const products = ctx.moduleRef.get(ProductsService);
  const savingsGoals = ctx.moduleRef.get(SavingsGoalsService);

  const seller = await createAuthenticatedUser(ctx.app, {
    firstName: 'SellerSched',
  });
  const buyer = await createAuthenticatedUser(ctx.app, {
    firstName: 'BuyerSched',
  });

  const shop = await shops.create({
    sellerId: seller.userId,
    name: 'Boutique Schedule E2E',
  });
  const product = await products.create(shop.id, {
    name: 'Produit Schedule',
    price: targetAmount,
  });

  const installments = Array.from({ length: installmentCount }, (_, i) => ({
    dueDate: new Date(Date.now() + (i + 1) * 86_400_000).toISOString(),
    amount: part,
  }));

  const goal = await savingsGoals.create({
    userId: buyer.userId,
    productId: product.id,
    mode: SavingsMode.schedule,
    installments,
  });

  return {
    seller,
    buyer,
    shopId: shop.id,
    productId: product.id,
    goalId: goal.id,
    ledgerAccountId: goal.ledgerAccountId,
    targetAmount,
    installments: goal.installments,
  };
}

export { authHeader };
