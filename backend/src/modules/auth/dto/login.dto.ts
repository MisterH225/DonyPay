import { IsEmail, IsString, Length } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  /** Code OTP (TOTP ou SMS) vérifié via TwoFactorService. */
  @IsString()
  @Length(6, 8)
  code!: string;
}
