import {
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { NotificationEventType } from '../ports/notification.port';

export class CreateNotificationDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @MinLength(1)
  type!: NotificationEventType | string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  pushToken?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
