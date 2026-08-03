import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class RecordDepositDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  /** Optionnel — rattache le versement à une échéance (mode schedule). */
  @IsOptional()
  @IsUUID()
  installmentId?: string;
}
