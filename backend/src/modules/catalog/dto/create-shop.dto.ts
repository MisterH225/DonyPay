import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateShopDto {
  /** Ignoré si JWT présent — forcé depuis `@CurrentUser()`. */
  @IsOptional()
  @IsUUID()
  sellerId?: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
