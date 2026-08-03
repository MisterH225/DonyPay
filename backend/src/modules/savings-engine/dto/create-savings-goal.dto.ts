import { SavingsMode } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class ScheduleInstallmentDto {
  @IsDateString()
  dueDate!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;
}

export class CreateSavingsGoalDto {
  /** Ignoré si JWT présent — forcé depuis `@CurrentUser()`. */
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsUUID()
  productId!: string;

  @IsEnum(SavingsMode)
  mode!: SavingsMode;

  /** Mode Échéancier : liste d'échéances (montants/dates fixes). */
  @ValidateIf((dto: CreateSavingsGoalDto) => dto.mode === SavingsMode.schedule)
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScheduleInstallmentDto)
  installments?: ScheduleInstallmentDto[];

  /** Mode Flexi : début de la période de versements libres. */
  @ValidateIf((dto: CreateSavingsGoalDto) => dto.mode === SavingsMode.flexi)
  @IsDateString()
  flexiStartsAt?: string;

  /** Mode Flexi : fin de la période de versements libres. */
  @ValidateIf((dto: CreateSavingsGoalDto) => dto.mode === SavingsMode.flexi)
  @IsDateString()
  flexiEndsAt?: string;
}
