import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  DisputeReason,
  DisputeStatus,
  DisputeSubjectType,
} from '@prisma/client';
import { DisputesService } from './disputes.service';
import type { DisputeAttachmentStoragePort } from './ports/dispute-attachment-storage.port';

describe('DisputesService', () => {
  let service: DisputesService;
  let prisma: {
    user: { findUnique: jest.Mock };
    savingsGoal: { findUnique: jest.Mock };
    paymentLink: { findUnique: jest.Mock };
    dispute: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    disputeMessage: { create: jest.Mock };
    disputeAttachment: { create: jest.Mock };
    disputeRating: { findUnique: jest.Mock; create: jest.Mock };
    $transaction: jest.Mock;
  };
  let storage: jest.Mocked<DisputeAttachmentStoragePort>;

  const user = { id: 'user-1', email: 'a@b.c' };
  const goal = {
    id: 'goal-1',
    userId: 'user-1',
    productId: 'prod-1',
    status: 'active',
  };
  const paymentLink = {
    id: 'link-1',
    token: 'tok',
    status: 'paid',
    installmentId: 'inst-1',
    installment: { goalId: 'goal-1' },
  };

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(async ({ where }) => (where.id === user.id ? user : null)) },
      savingsGoal: {
        findUnique: jest.fn(async ({ where }) =>
          where.id === goal.id ? goal : null,
        ),
      },
      paymentLink: {
        findUnique: jest.fn(async ({ where }) =>
          where.id === paymentLink.id ? paymentLink : null,
        ),
      },
      dispute: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      disputeMessage: { create: jest.fn() },
      disputeAttachment: { create: jest.fn() },
      disputeRating: { findUnique: jest.fn(), create: jest.fn() },
      $transaction: jest.fn(),
    };

    storage = {
      store: jest.fn(async (_disputeId, file) => ({
        storageKey: `d/file.pdf`,
        originalName: file.originalName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
      })),
    };

    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) =>
      fn(prisma),
    );

    service = new DisputesService(prisma as never, storage);
  });

  it('returns hello payload', () => {
    expect(service.getHello()).toEqual({
      module: 'disputes',
      message: 'Hello from disputes module',
    });
  });

  describe('create', () => {
    it('crée une réclamation liée à un plan d\'épargne avec message initial', async () => {
      const created = {
        id: 'disp-1',
        openedById: user.id,
        reason: DisputeReason.non_conforming_product,
        status: DisputeStatus.open,
        subjectType: DisputeSubjectType.savings_goal,
        savingsGoalId: goal.id,
        paymentLinkId: null,
        title: 'Produit défectueux',
        description: 'Le produit reçu est endommagé',
      };
      prisma.dispute.create.mockResolvedValue(created);
      prisma.disputeMessage.create.mockResolvedValue({ id: 'msg-1' });

      const result = await service.create({
        openedById: user.id,
        reason: DisputeReason.non_conforming_product,
        subjectType: DisputeSubjectType.savings_goal,
        savingsGoalId: goal.id,
        title: 'Produit défectueux',
        description: 'Le produit reçu est endommagé',
      });

      expect(result).toEqual(created);
      expect(prisma.dispute.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subjectType: DisputeSubjectType.savings_goal,
            savingsGoalId: goal.id,
            reason: DisputeReason.non_conforming_product,
          }),
        }),
      );
      expect(prisma.disputeMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            disputeId: 'disp-1',
            authorId: user.id,
            body: 'Le produit reçu est endommagé',
          }),
        }),
      );
    });

    it('crée une réclamation sur paiement délégué et dénormalise le goalId', async () => {
      prisma.dispute.create.mockResolvedValue({ id: 'disp-2' });
      prisma.disputeMessage.create.mockResolvedValue({ id: 'msg-2' });

      await service.create({
        openedById: user.id,
        reason: DisputeReason.third_party_payer,
        subjectType: DisputeSubjectType.payment_link,
        paymentLinkId: paymentLink.id,
        title: 'Litige payeur tiers',
        description: 'Le tiers conteste le paiement',
        initialMessage: 'Premier échange',
      });

      expect(prisma.dispute.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentLinkId: paymentLink.id,
            savingsGoalId: 'goal-1',
            reason: DisputeReason.third_party_payer,
          }),
        }),
      );
      expect(prisma.disputeMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ body: 'Premier échange' }),
        }),
      );
    });

    it('refuse un goal inexistant', async () => {
      await expect(
        service.create({
          openedById: user.id,
          reason: DisputeReason.payment_not_received,
          subjectType: DisputeSubjectType.savings_goal,
          savingsGoalId: 'missing',
          title: 'x',
          description: 'y',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('passe open → in_progress → resolved', async () => {
      prisma.dispute.findUnique
        .mockResolvedValueOnce({
          id: 'disp-1',
          status: DisputeStatus.open,
          resolutionNote: null,
          resolvedAt: null,
        })
        .mockResolvedValueOnce({
          id: 'disp-1',
          status: DisputeStatus.in_progress,
          resolutionNote: null,
          resolvedAt: null,
        });
      prisma.dispute.update
        .mockResolvedValueOnce({
          id: 'disp-1',
          status: DisputeStatus.in_progress,
        })
        .mockResolvedValueOnce({
          id: 'disp-1',
          status: DisputeStatus.resolved,
          resolvedAt: new Date(),
        });

      await service.updateStatus('disp-1', {
        status: DisputeStatus.in_progress,
      });
      await service.updateStatus('disp-1', {
        status: DisputeStatus.resolved,
        resolutionNote: 'Remboursement accordé',
      });

      expect(prisma.dispute.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: DisputeStatus.resolved,
            resolutionNote: 'Remboursement accordé',
            resolvedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('refuse une transition invalide (resolved → open)', async () => {
      prisma.dispute.findUnique.mockResolvedValue({
        id: 'disp-1',
        status: DisputeStatus.resolved,
      });

      await expect(
        service.updateStatus('disp-1', { status: DisputeStatus.open }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('addMessage / addAttachment', () => {
    it('ajoute un message à un litige ouvert', async () => {
      prisma.dispute.findUnique.mockResolvedValue({
        id: 'disp-1',
        status: DisputeStatus.open,
      });
      prisma.disputeMessage.create.mockResolvedValue({
        id: 'msg-3',
        body: 'Suite',
      });

      const msg = await service.addMessage('disp-1', {
        authorId: user.id,
        body: 'Suite',
      });
      expect(msg.body).toBe('Suite');
    });

    it('refuse messages et PJ sur litige rejeté', async () => {
      prisma.dispute.findUnique.mockResolvedValue({
        id: 'disp-1',
        status: DisputeStatus.rejected,
      });

      await expect(
        service.addMessage('disp-1', { authorId: user.id, body: 'x' }),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        service.addAttachment('disp-1', user.id, {
          buffer: Buffer.from('x'),
          originalName: 'a.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('stocke une pièce jointe', async () => {
      prisma.dispute.findUnique.mockResolvedValue({
        id: 'disp-1',
        status: DisputeStatus.in_progress,
      });
      prisma.disputeAttachment.create.mockResolvedValue({
        id: 'att-1',
        storageKey: 'd/file.pdf',
      });

      const att = await service.addAttachment('disp-1', user.id, {
        buffer: Buffer.from('%PDF'),
        originalName: 'preuve.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 4,
      });

      expect(storage.store).toHaveBeenCalled();
      expect(att.id).toBe('att-1');
    });
  });

  describe('rate', () => {
    it('accepte une notation post-résolution', async () => {
      prisma.dispute.findUnique.mockResolvedValue({
        id: 'disp-1',
        status: DisputeStatus.resolved,
      });
      prisma.disputeRating.findUnique.mockResolvedValue(null);
      prisma.disputeRating.create.mockResolvedValue({
        id: 'rate-1',
        score: 5,
        comment: 'Bien géré',
      });

      const rating = await service.rate('disp-1', {
        userId: user.id,
        score: 5,
        comment: 'Bien géré',
      });

      expect(rating.score).toBe(5);
    });

    it('refuse la notation si non résolu', async () => {
      prisma.dispute.findUnique.mockResolvedValue({
        id: 'disp-1',
        status: DisputeStatus.in_progress,
      });

      await expect(
        service.rate('disp-1', { userId: user.id, score: 3 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuse une double notation', async () => {
      prisma.dispute.findUnique.mockResolvedValue({
        id: 'disp-1',
        status: DisputeStatus.resolved,
      });
      prisma.disputeRating.findUnique.mockResolvedValue({ id: 'rate-1' });

      await expect(
        service.rate('disp-1', { userId: user.id, score: 4 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
