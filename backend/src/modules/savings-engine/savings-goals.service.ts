import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InstallmentStatus,
  Prisma,
  SavingsGoalStatus,
  SavingsMode,
  type Product,
  type SavingsGoal,
  type SavingsInstallment,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LEDGER_PORT, type LedgerPort } from '../ledger-adapter';
import { NotificationsService } from '../notifications';
import { CreateSavingsGoalDto } from './dto/create-savings-goal.dto';
import { RecordDepositDto } from './dto/record-deposit.dto';

type GoalWithRelations = SavingsGoal & {
  installments: SavingsInstallment[];
  product: Product & {
    shop: { sellerId: string; name: string; seller?: { phone: string | null } };
  };
  user?: { id: string; phone: string | null; email: string };
};

@Injectable()
export class SavingsGoalsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LEDGER_PORT) private readonly ledger: LedgerPort,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateSavingsGoalDto): Promise<GoalWithRelations> {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) {
      throw new NotFoundException(`User ${dto.userId} not found`);
    }

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { shop: true },
    });
    if (!product) {
      throw new NotFoundException(`Product ${dto.productId} not found`);
    }

    const targetAmount = product.price;
    this.assertModeConfig(dto, targetAmount);

    const ledgerAccountId = await this.ledger.openSavingsAccount(dto.userId);

    const goal = await this.prisma.savingsGoal.create({
      data: {
        userId: dto.userId,
        productId: dto.productId,
        mode: dto.mode,
        targetAmount,
        ledgerAccountId,
        flexiStartsAt:
          dto.mode === SavingsMode.flexi ? new Date(dto.flexiStartsAt!) : null,
        flexiEndsAt:
          dto.mode === SavingsMode.flexi ? new Date(dto.flexiEndsAt!) : null,
        installments:
          dto.mode === SavingsMode.schedule
            ? {
                create: dto.installments!.map((item, index) => ({
                  sequence: index + 1,
                  dueDate: new Date(item.dueDate),
                  amount: new Prisma.Decimal(item.amount).toDecimalPlaces(2),
                })),
              }
            : undefined,
      },
      include: {
        installments: { orderBy: { sequence: 'asc' } },
        product: { include: { shop: { include: { seller: true } } } },
        user: true,
      },
    });

    return goal;
  }

  async findById(id: string): Promise<GoalWithRelations> {
    const goal = await this.prisma.savingsGoal.findUnique({
      where: { id },
      include: {
        installments: { orderBy: { sequence: 'asc' } },
        product: { include: { shop: { include: { seller: true } } } },
        user: true,
        deposits: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!goal) {
      throw new NotFoundException(`Savings goal ${id} not found`);
    }

    return goal;
  }

  async listByUser(userId: string): Promise<SavingsGoal[]> {
    return this.prisma.savingsGoal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Plans d'épargne liés aux produits de la boutique du vendeur. */
  async listBySeller(sellerId: string): Promise<GoalWithRelations[]> {
    const seller = await this.prisma.user.findUnique({ where: { id: sellerId } });
    if (!seller) {
      throw new NotFoundException(`Seller ${sellerId} not found`);
    }

    return this.prisma.savingsGoal.findMany({
      where: { product: { shop: { sellerId } } },
      orderBy: { createdAt: 'desc' },
      include: {
        installments: { orderBy: { sequence: 'asc' } },
        product: { include: { shop: { include: { seller: true } } } },
        user: true,
        deposits: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  /**
   * Confirmation vendeur : remise du produit une fois l'objectif atteint.
   * Débite le ledger d'épargne et passe le goal en `completed`.
   */
  async confirmHandover(goalId: string, sellerId: string): Promise<GoalWithRelations> {
    const goal = await this.findById(goalId);

    if (goal.product.shop.sellerId !== sellerId) {
      throw new BadRequestException(
        'Only the product seller can confirm handover',
      );
    }

    if (goal.status !== SavingsGoalStatus.ready_for_withdrawal) {
      throw new BadRequestException(
        `Cannot confirm handover for goal with status ${goal.status}`,
      );
    }

    const amount = goal.savedAmount.toNumber();
    if (amount > 0) {
      await this.ledger.recordWithdrawal(goal.ledgerAccountId, amount);
    }

    const updated = await this.prisma.savingsGoal.update({
      where: { id: goalId },
      data: { status: SavingsGoalStatus.completed },
      include: {
        installments: { orderBy: { sequence: 'asc' } },
        product: { include: { shop: { include: { seller: true } } } },
        user: true,
        deposits: { orderBy: { createdAt: 'desc' } },
      },
    });

    await this.notifications.notifyProductHandedOver({
      userId: updated.userId,
      phone: updated.user?.phone,
      title: 'Produit remis',
      body: `Votre produit « ${updated.product.name} » a été remis par le vendeur.`,
      metadata: {
        goalId: updated.id,
        productId: updated.productId,
        sellerId,
        amount: updated.savedAmount.toString(),
      },
    });

    return updated;
  }

  async recordDeposit(goalId: string, dto: RecordDepositDto) {
    const goal = await this.findById(goalId);

    if (goal.status !== SavingsGoalStatus.active) {
      throw new BadRequestException(
        `Cannot deposit on goal with status ${goal.status}`,
      );
    }

    const amount = new Prisma.Decimal(dto.amount).toDecimalPlaces(2);
    if (amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('amount must be positive');
    }

    if (goal.mode === SavingsMode.flexi) {
      this.assertWithinFlexiPeriod(goal);
    }

    let installment: SavingsInstallment | null = null;
    if (dto.installmentId) {
      if (goal.mode !== SavingsMode.schedule) {
        throw new BadRequestException(
          'installmentId is only valid for schedule mode',
        );
      }
      installment =
        goal.installments.find((item) => item.id === dto.installmentId) ?? null;
      if (!installment) {
        throw new NotFoundException(
          `Installment ${dto.installmentId} not found on this goal`,
        );
      }
      if (installment.status === InstallmentStatus.paid) {
        throw new BadRequestException('Installment is already paid');
      }
    }

    await this.ledger.recordDeposit(goal.ledgerAccountId, amount.toNumber(), {
      goalId: goal.id,
      productId: goal.productId,
      installmentId: installment?.id,
      mode: goal.mode,
    });

    const { updated, reached } = await this.prisma.$transaction(async (tx) => {
      if (installment) {
        await tx.savingsInstallment.update({
          where: { id: installment.id },
          data: {
            status: InstallmentStatus.paid,
            paidAt: new Date(),
          },
        });
      }

      await tx.savingsDeposit.create({
        data: {
          goalId: goal.id,
          installmentId: installment?.id,
          amount,
        },
      });

      // Incrément atomique côté DB — évite une valeur précalculée hors transaction.
      await tx.savingsGoal.update({
        where: { id: goal.id },
        data: { savedAmount: { increment: amount } },
      });

      const current = await tx.savingsGoal.findUniqueOrThrow({
        where: { id: goal.id },
      });
      const reached = current.savedAmount.greaterThanOrEqualTo(
        current.targetAmount,
      );

      const updated = await tx.savingsGoal.update({
        where: { id: goal.id },
        data: reached
          ? {
              status: SavingsGoalStatus.ready_for_withdrawal,
              readyAt: new Date(),
            }
          : {},
        include: {
          installments: { orderBy: { sequence: 'asc' } },
          product: { include: { shop: { include: { seller: true } } } },
          user: true,
          deposits: { orderBy: { createdAt: 'desc' } },
        },
      });

      return { updated, reached };
    });

    await this.notifications.notifyDepositReceived({
      userId: updated.userId,
      phone: updated.user.phone,
      title: 'Versement reçu',
      body: `Versement de ${amount.toString()} enregistré pour « ${updated.product.name} ».`,
      metadata: {
        goalId: updated.id,
        productId: updated.productId,
        amount: amount.toString(),
        installmentId: installment?.id,
      },
    });

    if (reached) {
      await this.notifications.notifyGoalReached({
        userId: updated.product.shop.sellerId,
        phone: updated.product.shop.seller?.phone,
        title: 'Objectif d’épargne atteint',
        body: `L’épargne pour « ${updated.product.name} » est prête pour retrait.`,
        metadata: {
          goalId: updated.id,
          productId: updated.productId,
          buyerId: updated.userId,
          targetAmount: updated.targetAmount.toString(),
        },
      });
    }

    return updated;
  }

  async cancel(goalId: string) {
    const goal = await this.findById(goalId);

    if (
      goal.status === SavingsGoalStatus.cancelled ||
      goal.status === SavingsGoalStatus.completed
    ) {
      throw new BadRequestException(
        `Cannot cancel goal with status ${goal.status}`,
      );
    }

    const updated = await this.prisma.savingsGoal.update({
      where: { id: goalId },
      data: {
        status: SavingsGoalStatus.cancelled,
        installments: {
          updateMany: {
            where: {
              status: {
                in: [InstallmentStatus.pending, InstallmentStatus.overdue],
              },
            },
            data: { status: InstallmentStatus.cancelled },
          },
        },
      },
      include: {
        installments: { orderBy: { sequence: 'asc' } },
        product: { include: { shop: { include: { seller: true } } } },
        user: true,
      },
    });

    await this.notifications.notifyPlanCancelled({
      userId: updated.userId,
      phone: updated.user.phone,
      title: 'Plan d’épargne annulé',
      body: `Votre plan pour « ${updated.product.name} » a été annulé.`,
      metadata: {
        goalId: updated.id,
        productId: updated.productId,
      },
    });

    return updated;
  }

  /**
   * Envoie les rappels d'échéances dues (ou à venir dans les prochaines 24h)
   * pour le mode Échéancier.
   */
  async dispatchDueReminders(now = new Date()) {
    const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const dueInstallments = await this.prisma.savingsInstallment.findMany({
      where: {
        status: InstallmentStatus.pending,
        reminderSentAt: null,
        dueDate: { lte: horizon },
        goal: {
          status: SavingsGoalStatus.active,
          mode: SavingsMode.schedule,
        },
      },
      include: {
        goal: {
          include: {
            product: true,
            user: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    const sent = [];

    for (const installment of dueInstallments) {
      const notification = await this.notifications.notifyInstallmentDue({
        userId: installment.goal.userId,
        phone: installment.goal.user.phone,
        title: 'Échéance d’épargne à venir',
        body: `Versement de ${installment.amount.toString()} dû le ${installment.dueDate.toISOString().slice(0, 10)} pour « ${installment.goal.product.name} ».`,
        metadata: {
          goalId: installment.goalId,
          installmentId: installment.id,
          dueDate: installment.dueDate.toISOString(),
          amount: installment.amount.toString(),
        },
      });

      await this.prisma.savingsInstallment.update({
        where: { id: installment.id },
        data: {
          reminderSentAt: now,
          status:
            installment.dueDate < now
              ? InstallmentStatus.overdue
              : InstallmentStatus.pending,
        },
      });

      sent.push(notification);
    }

    return { count: sent.length, notifications: sent };
  }

  private assertModeConfig(
    dto: CreateSavingsGoalDto,
    targetAmount: Prisma.Decimal,
  ): void {
    if (dto.mode === SavingsMode.schedule) {
      if (!dto.installments?.length) {
        throw new BadRequestException(
          'installments are required for schedule mode',
        );
      }

      const total = dto.installments.reduce(
        (sum, item) => sum.add(new Prisma.Decimal(item.amount)),
        new Prisma.Decimal(0),
      );

      if (!total.equals(targetAmount)) {
        throw new BadRequestException(
          `Sum of installments (${total.toString()}) must equal product price (${targetAmount.toString()})`,
        );
      }
      return;
    }

    if (!dto.flexiStartsAt || !dto.flexiEndsAt) {
      throw new BadRequestException(
        'flexiStartsAt and flexiEndsAt are required for flexi mode',
      );
    }

    const starts = new Date(dto.flexiStartsAt);
    const ends = new Date(dto.flexiEndsAt);
    if (!(starts < ends)) {
      throw new BadRequestException('flexiStartsAt must be before flexiEndsAt');
    }
  }

  private assertWithinFlexiPeriod(goal: SavingsGoal): void {
    const now = new Date();
    if (
      !goal.flexiStartsAt ||
      !goal.flexiEndsAt ||
      now < goal.flexiStartsAt ||
      now > goal.flexiEndsAt
    ) {
      throw new BadRequestException(
        'Deposit is outside the flexi savings period',
      );
    }
  }
}
