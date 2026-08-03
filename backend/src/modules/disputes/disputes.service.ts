import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DisputeStatus,
  DisputeSubjectType,
  type Dispute,
  type DisputeAttachment,
  type DisputeMessage,
  type DisputeRating,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AddDisputeMessageDto } from './dto/add-dispute-message.dto';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { RateDisputeDto } from './dto/rate-dispute.dto';
import { UpdateDisputeStatusDto } from './dto/update-dispute-status.dto';
import {
  DISPUTE_ATTACHMENT_STORAGE_PORT,
  type DisputeAttachmentFile,
  type DisputeAttachmentStoragePort,
} from './ports/dispute-attachment-storage.port';

const TERMINAL_STATUSES: DisputeStatus[] = [
  DisputeStatus.resolved,
  DisputeStatus.rejected,
];

const ALLOWED_TRANSITIONS: Record<DisputeStatus, DisputeStatus[]> = {
  [DisputeStatus.open]: [
    DisputeStatus.in_progress,
    DisputeStatus.resolved,
    DisputeStatus.rejected,
  ],
  [DisputeStatus.in_progress]: [
    DisputeStatus.resolved,
    DisputeStatus.rejected,
  ],
  [DisputeStatus.resolved]: [],
  [DisputeStatus.rejected]: [],
};

@Injectable()
export class DisputesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(DISPUTE_ATTACHMENT_STORAGE_PORT)
    private readonly storage: DisputeAttachmentStoragePort,
  ) {}

  getHello(): { module: string; message: string } {
    return {
      module: 'disputes',
      message: 'Hello from disputes module',
    };
  }

  async create(dto: CreateDisputeDto): Promise<Dispute> {
    await this.ensureUserExists(dto.openedById);

    let savingsGoalId: string | null = null;
    let paymentLinkId: string | null = null;

    if (dto.subjectType === DisputeSubjectType.savings_goal) {
      if (!dto.savingsGoalId) {
        throw new BadRequestException(
          'savingsGoalId is required when subjectType is savings_goal',
        );
      }
      const goal = await this.prisma.savingsGoal.findUnique({
        where: { id: dto.savingsGoalId },
      });
      if (!goal) {
        throw new NotFoundException(
          `Savings goal ${dto.savingsGoalId} not found`,
        );
      }
      savingsGoalId = goal.id;
    } else if (dto.subjectType === DisputeSubjectType.payment_link) {
      if (!dto.paymentLinkId) {
        throw new BadRequestException(
          'paymentLinkId is required when subjectType is payment_link',
        );
      }
      const link = await this.prisma.paymentLink.findUnique({
        where: { id: dto.paymentLinkId },
        include: { installment: true },
      });
      if (!link) {
        throw new NotFoundException(
          `Payment link ${dto.paymentLinkId} not found`,
        );
      }
      paymentLinkId = link.id;
      savingsGoalId = link.installment.goalId;
    } else {
      throw new BadRequestException(`Unsupported subjectType`);
    }

    return this.prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.create({
        data: {
          openedById: dto.openedById,
          reason: dto.reason,
          subjectType: dto.subjectType,
          savingsGoalId,
          paymentLinkId,
          title: dto.title,
          description: dto.description,
          status: DisputeStatus.open,
        },
      });

      const firstBody = dto.initialMessage?.trim() || dto.description;
      await tx.disputeMessage.create({
        data: {
          disputeId: dispute.id,
          authorId: dto.openedById,
          body: firstBody,
        },
      });

      return dispute;
    });
  }

  async findById(id: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        attachments: { orderBy: { createdAt: 'asc' } },
        rating: true,
        savingsGoal: {
          select: { id: true, userId: true, productId: true, status: true },
        },
        paymentLink: {
          select: {
            id: true,
            token: true,
            status: true,
            installmentId: true,
          },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundException(`Dispute ${id} not found`);
    }

    return dispute;
  }

  async listByUser(userId: string) {
    await this.ensureUserExists(userId);
    return this.prisma.dispute.findMany({
      where: { openedById: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        rating: true,
        _count: { select: { messages: true, attachments: true } },
      },
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateDisputeStatusDto,
  ): Promise<Dispute> {
    const dispute = await this.requireDispute(id);
    const allowed = ALLOWED_TRANSITIONS[dispute.status];

    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition dispute from ${dispute.status} to ${dto.status}`,
      );
    }

    const isTerminal = TERMINAL_STATUSES.includes(dto.status);

    return this.prisma.dispute.update({
      where: { id },
      data: {
        status: dto.status,
        resolutionNote: dto.resolutionNote ?? dispute.resolutionNote,
        resolvedAt: isTerminal ? new Date() : dispute.resolvedAt,
      },
    });
  }

  async addMessage(
    disputeId: string,
    dto: AddDisputeMessageDto,
  ): Promise<DisputeMessage> {
    const dispute = await this.requireDispute(disputeId);
    if (TERMINAL_STATUSES.includes(dispute.status)) {
      throw new BadRequestException(
        `Cannot add messages to a ${dispute.status} dispute`,
      );
    }

    await this.ensureUserExists(dto.authorId);

    return this.prisma.disputeMessage.create({
      data: {
        disputeId,
        authorId: dto.authorId,
        body: dto.body,
      },
    });
  }

  async addAttachment(
    disputeId: string,
    uploadedById: string,
    file: DisputeAttachmentFile,
  ): Promise<DisputeAttachment> {
    const dispute = await this.requireDispute(disputeId);
    if (TERMINAL_STATUSES.includes(dispute.status)) {
      throw new BadRequestException(
        `Cannot add attachments to a ${dispute.status} dispute`,
      );
    }

    await this.ensureUserExists(uploadedById);

    if (!file?.buffer?.length) {
      throw new BadRequestException('Attachment file is required');
    }

    const stored = await this.storage.store(disputeId, file);

    return this.prisma.disputeAttachment.create({
      data: {
        disputeId,
        uploadedById,
        storageKey: stored.storageKey,
        originalName: stored.originalName,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
      },
    });
  }

  /**
   * Notation post-résolution — uniquement si le litige est `resolved`.
   */
  async rate(disputeId: string, dto: RateDisputeDto): Promise<DisputeRating> {
    const dispute = await this.requireDispute(disputeId);

    if (dispute.status !== DisputeStatus.resolved) {
      throw new BadRequestException(
        'Rating is only allowed after the dispute is resolved',
      );
    }

    await this.ensureUserExists(dto.userId);

    const existing = await this.prisma.disputeRating.findUnique({
      where: { disputeId },
    });
    if (existing) {
      throw new ConflictException('This dispute has already been rated');
    }

    return this.prisma.disputeRating.create({
      data: {
        disputeId,
        userId: dto.userId,
        score: dto.score,
        comment: dto.comment,
      },
    });
  }

  private async requireDispute(id: string): Promise<Dispute> {
    const dispute = await this.prisma.dispute.findUnique({ where: { id } });
    if (!dispute) {
      throw new NotFoundException(`Dispute ${id} not found`);
    }
    return dispute;
  }

  private async ensureUserExists(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }
  }
}
