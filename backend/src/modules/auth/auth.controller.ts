import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RequestOtpDto } from './dto/request-otp.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Active la 2FA SMS + envoie le premier code (bootstrap pré-login). */
  @Public()
  @Post('enroll/sms')
  enrollSms(@Body() dto: RequestOtpDto) {
    return this.authService.enrollSms(dto.email);
  }

  /** Déclenche l’envoi OTP SMS (ou indique d’utiliser TOTP). */
  @Public()
  @Post('otp')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto.email);
  }

  /**
   * Login sans mot de passe : email + code OTP (TwoFactorService).
   * Émet access JWT (courte durée) + refresh token.
   */
  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.code);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }
}
