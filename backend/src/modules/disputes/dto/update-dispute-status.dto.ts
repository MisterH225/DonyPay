import { DisputeStatus } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateDisputeStatusDto {
  @IsEnum(DisputeStatus)
  status!: DisputeStatus;

  @ValidateIf(
    (dto: UpdateDisputeStatusDto) =>
      dto.status === DisputeStatus.resolved ||
      dto.status === DisputeStatus.rejected,
  )
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  resolutionNote?: string;
}
