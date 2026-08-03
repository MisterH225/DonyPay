import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
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

  @Get('hello')
  getHello() {
    return this.identityService.getHello();
  }

  @Post('users')
  createUser(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get('users/:id')
  getUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  @Get('users/:id/kyc')
  getKycStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.kycService.getStatus(id);
  }

  @Post('users/:id/documents/identity')
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  uploadIdentityDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: UploadedMulterFile,
  ) {
    return this.kycService.uploadIdentityDocument(id, {
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    });
  }

  @Post('users/:id/documents/address')
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  uploadProofOfAddress(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: UploadedMulterFile,
  ) {
    return this.kycService.uploadProofOfAddress(id, {
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    });
  }

  @Post('users/:id/kyc/submit')
  submitKyc(@Param('id', ParseUUIDPipe) id: string) {
    return this.kycService.submitToExternalProvider(id);
  }

  @Post('users/:id/kyc/sync')
  syncKyc(@Param('id', ParseUUIDPipe) id: string) {
    return this.kycService.syncExternalStatus(id);
  }

  @Post('users/:id/2fa/totp/setup')
  setupTotp(@Param('id', ParseUUIDPipe) id: string) {
    return this.twoFactorService.setupTotp(id);
  }

  @Post('users/:id/2fa/totp/confirm')
  confirmTotp(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmTotpDto,
  ) {
    return this.twoFactorService.confirmTotp(id, dto.code);
  }

  @Post('users/:id/2fa/sms/enable')
  enableSms(@Param('id', ParseUUIDPipe) id: string) {
    return this.twoFactorService.enableSms(id);
  }

  @Post('users/:id/2fa/sms/send-code')
  sendSmsCode(@Param('id', ParseUUIDPipe) id: string) {
    return this.twoFactorService.sendSmsCode(id);
  }

  @Post('users/:id/2fa/verify')
  verify2fa(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Verify2faDto) {
    return this.twoFactorService.verify(id, dto.code);
  }
}
