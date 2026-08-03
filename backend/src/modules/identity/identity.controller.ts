import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ConfirmTotpDto } from './dto/confirm-totp.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { Verify2faDto } from './dto/verify-2fa.dto';
import { IdentityService } from './identity.service';
import { KycService } from './kyc.service';
import { TwoFactorService } from './two-factor.service';
import { UsersService } from './users.service';

type UploadedMulterFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

const uploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
};

@Controller('identity')
export class IdentityController {
  constructor(
    private readonly identityService: IdentityService,
    private readonly usersService: UsersService,
    private readonly kycService: KycService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  @Public()
  @Get('hello')
  getHello() {
    return this.identityService.getHello();
  }

  /** Inscription — ouverte (pas encore de JWT). */
  @Public()
  @Post('users')
  createUser(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get('me')
  getMe(@CurrentUser('userId') userId: string) {
    return this.usersService.findById(userId);
  }

  @Get('me/kyc')
  getKycStatus(@CurrentUser('userId') userId: string) {
    return this.kycService.getStatus(userId);
  }

  @Post('me/documents/identity')
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  uploadIdentityDocument(
    @CurrentUser('userId') userId: string,
    @UploadedFile() file: UploadedMulterFile,
  ) {
    return this.kycService.uploadIdentityDocument(userId, {
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    });
  }

  @Post('me/documents/address')
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  uploadProofOfAddress(
    @CurrentUser('userId') userId: string,
    @UploadedFile() file: UploadedMulterFile,
  ) {
    return this.kycService.uploadProofOfAddress(userId, {
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    });
  }

  @Post('me/kyc/submit')
  submitKyc(@CurrentUser('userId') userId: string) {
    return this.kycService.submitToExternalProvider(userId);
  }

  @Post('me/kyc/sync')
  syncKyc(@CurrentUser('userId') userId: string) {
    return this.kycService.syncExternalStatus(userId);
  }

  @Post('me/2fa/totp/setup')
  setupTotp(@CurrentUser('userId') userId: string) {
    return this.twoFactorService.setupTotp(userId);
  }

  @Post('me/2fa/totp/confirm')
  confirmTotp(
    @CurrentUser('userId') userId: string,
    @Body() dto: ConfirmTotpDto,
  ) {
    return this.twoFactorService.confirmTotp(userId, dto.code);
  }

  @Post('me/2fa/sms/enable')
  enableSms(@CurrentUser('userId') userId: string) {
    return this.twoFactorService.enableSms(userId);
  }

  @Post('me/2fa/sms/send-code')
  sendSmsCode(@CurrentUser('userId') userId: string) {
    return this.twoFactorService.sendSmsCode(userId);
  }

  @Post('me/2fa/verify')
  verify2fa(
    @CurrentUser('userId') userId: string,
    @Body() dto: Verify2faDto,
  ) {
    return this.twoFactorService.verify(userId, dto.code);
  }
}
