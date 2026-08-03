import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Simule le webhook CinetPay en sandbox (génère le HMAC côté serveur).
 * Désactivé hors mode sandbox.
 */
export class SandboxSimulateCallbackDto {
  @IsString()
  @MinLength(1)
  providerRef!: string;

  /** true = SUCCES, false = échec. */
  @IsOptional()
  @IsBoolean()
  success?: boolean;
}
