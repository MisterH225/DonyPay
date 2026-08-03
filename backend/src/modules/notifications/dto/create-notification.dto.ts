import { IsObject, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateNotificationDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @MinLength(1)
  type!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
