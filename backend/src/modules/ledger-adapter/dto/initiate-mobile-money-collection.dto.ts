import { Type } from 'class-transformer';
import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class InitiateMobileMoneyCollectionDto {
  @IsUUID()
  accountId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  amount!: number;

  @IsString()
  @MinLength(8)
  @MaxLength(20)
  @Matches(/^\+?[0-9]+$/, {
    message: 'phone must be a numeric MSISDN',
  })
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  operator?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
