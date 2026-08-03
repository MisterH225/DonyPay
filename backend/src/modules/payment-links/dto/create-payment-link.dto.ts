import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreatePaymentLinkDto {
  @IsUUID()
  installmentId!: string;

  /**
   * Numéro Mobile Money qui recevra le push USSD.
   * Défaut : téléphone du titulaire de l’objectif.
   */
  @IsOptional()
  @IsString()
  @MinLength(8)
  phone?: string;

  @IsOptional()
  @IsString()
  operator?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  payerName?: string;
}
