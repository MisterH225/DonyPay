import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class MobileMoneyCallbackDto {
  @IsIn(['success', 'failed'])
  status!: 'success' | 'failed';

  @IsString()
  @MinLength(1)
  payerName!: string;

  @IsString()
  @MinLength(1)
  payerPhone!: string;

  @IsString()
  @MinLength(1)
  payerOperator!: string;

  @IsOptional()
  @IsString()
  providerRef?: string;
}
