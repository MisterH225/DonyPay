import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AddDisputeMessageDto } from './dto/add-dispute-message.dto';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { RateDisputeDto } from './dto/rate-dispute.dto';
import { UpdateDisputeStatusDto } from './dto/update-dispute-status.dto';
import { DisputesService } from './disputes.service';

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

@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Get('hello')
  getHello() {
    return this.disputesService.getHello();
  }

  @Post()
  create(@Body() dto: CreateDisputeDto) {
    return this.disputesService.create(dto);
  }

  @Get('users/:userId')
  listByUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.disputesService.listByUser(userId);
  }

  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.disputesService.findById(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDisputeStatusDto,
  ) {
    return this.disputesService.updateStatus(id, dto);
  }

  @Post(':id/messages')
  addMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddDisputeMessageDto,
  ) {
    return this.disputesService.addMessage(id, dto);
  }

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  addAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('uploadedById', ParseUUIDPipe) uploadedById: string,
    @UploadedFile() file: UploadedMulterFile,
  ) {
    return this.disputesService.addAttachment(id, uploadedById, {
      buffer: file?.buffer,
      originalName: file?.originalname ?? 'attachment',
      mimeType: file?.mimetype ?? 'application/octet-stream',
      sizeBytes: file?.size ?? 0,
    });
  }

  @Post(':id/rating')
  rate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RateDisputeDto) {
    return this.disputesService.rate(id, dto);
  }
}
