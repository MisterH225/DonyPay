import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Shop } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShopDto } from './dto/create-shop.dto';

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateShopDto): Promise<Shop> {
    const seller = await this.prisma.user.findUnique({
      where: { id: dto.sellerId },
    });
    if (!seller) {
      throw new NotFoundException(`Seller ${dto.sellerId} not found`);
    }

    const existing = await this.prisma.shop.findUnique({
      where: { sellerId: dto.sellerId },
    });
    if (existing) {
      throw new ConflictException(
        `Seller ${dto.sellerId} already owns a shop`,
      );
    }

    return this.prisma.shop.create({
      data: {
        sellerId: dto.sellerId,
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async findById(id: string): Promise<Shop> {
    const shop = await this.prisma.shop.findUnique({ where: { id } });
    if (!shop) {
      throw new NotFoundException(`Shop ${id} not found`);
    }
    return shop;
  }

  async findBySellerId(sellerId: string): Promise<Shop> {
    const shop = await this.prisma.shop.findUnique({ where: { sellerId } });
    if (!shop) {
      throw new NotFoundException(`No shop for seller ${sellerId}`);
    }
    return shop;
  }
}
