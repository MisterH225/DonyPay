import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User, UserType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<User> {
    this.assertProfileFields(dto);

    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException(`User with email ${email} already exists`);
    }

    return this.prisma.user.create({
      data: {
        email: dto.email.trim().toLowerCase(),
        phone: dto.phone,
        type: dto.type,
        firstName: dto.type === UserType.individual ? dto.firstName : null,
        lastName: dto.type === UserType.individual ? dto.lastName : null,
        companyName: dto.type === UserType.company ? dto.companyName : null,
        siret: dto.type === UserType.company ? dto.siret : null,
      },
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return user;
  }

  private assertProfileFields(dto: CreateUserDto): void {
    if (dto.type === UserType.individual) {
      if (!dto.firstName?.trim() || !dto.lastName?.trim()) {
        throw new BadRequestException(
          'firstName and lastName are required for individual users',
        );
      }
      return;
    }

    if (!dto.companyName?.trim() || !dto.siret?.trim()) {
      throw new BadRequestException(
        'companyName and siret are required for company users',
      );
    }
  }
}
