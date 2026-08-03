import { DisputeReason, DisputeSubjectType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateDisputeDto {
  @IsUUID()
  openedById!: string;

  @IsEnum(DisputeReason)
  reason!: DisputeReason;

  @IsEnum(DisputeSubjectType)
  subjectType!: DisputeSubjectType;

  @ValidateIf((dto: CreateDisputeDto) => dto.subjectType === 'savings_goal')
  @IsUUID()
  savingsGoalId?: string;

  @ValidateIf((dto: CreateDisputeDto) => dto.subjectType === 'payment_link')
  @IsUUID()
  paymentLinkId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description!: string;

  /** Premier message optionnel dans l'historique. */
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  initialMessage?: string;
}
