import { UserType } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(UserType)
  type!: UserType;

  @ValidateIf((dto: CreateUserDto) => dto.type === UserType.individual)
  @IsString()
  @MinLength(1)
  firstName?: string;

  @ValidateIf((dto: CreateUserDto) => dto.type === UserType.individual)
  @IsString()
  @MinLength(1)
  lastName?: string;

  @ValidateIf((dto: CreateUserDto) => dto.type === UserType.company)
  @IsString()
  @MinLength(1)
  companyName?: string;

  @ValidateIf((dto: CreateUserDto) => dto.type === UserType.company)
  @IsString()
  @MinLength(1)
  siret?: string;
}
