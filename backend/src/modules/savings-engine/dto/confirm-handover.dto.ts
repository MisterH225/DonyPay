import { IsUUID } from 'class-validator';

export class ConfirmHandoverDto {
  /** Vendeur propriétaire de la boutique du produit. */
  @IsUUID()
  sellerId!: string;
}
