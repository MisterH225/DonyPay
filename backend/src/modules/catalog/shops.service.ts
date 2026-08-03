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

  async create(dto: CreateShopDto & { sellerId: string }): Promise<Shop> {
    const sellerId = dto.sellerId;
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
    });
    if (!seller) {
      throw new NotFoundException(`Seller ${sellerId} not found`);
    }

    const existing = await this.prisma.shop.findUnique({
      where: { sellerId },
    });
    if (existing) {
      throw new ConflictException(`Seller ${sellerId} already owns a shop`);
    }

    return this.prisma.shop.create({
      data: {
        sellerId,
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
