import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Product } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import {
  CATALOG_STORAGE_PORT,
  type CatalogFile,
  type CatalogStoragePort,
} from './ports/catalog-storage.port';
import { QR_CODE_PORT, type QrCodePort } from './ports/qr-code.port';
import { ShopsService } from './shops.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shopsService: ShopsService,
    @Inject(CATALOG_STORAGE_PORT)
    private readonly storage: CatalogStoragePort,
    @Inject(QR_CODE_PORT)
    private readonly qrCode: QrCodePort,
  ) {}

  async create(
    shopId: string,
    dto: CreateProductDto,
    photo?: CatalogFile,
  ): Promise<Product> {
    await this.shopsService.findById(shopId);

    if (!Number.isFinite(dto.price) || dto.price <= 0) {
      throw new BadRequestException('price must be a positive number');
    }

    const productId = randomUUID();
    const qrPayload = this.buildQrPayload(shopId, productId);
    const qrPng = await this.qrCode.generatePng(qrPayload);
    const qrCodeKey = await this.storage.storeQrImage(shopId, productId, qrPng);

    let photoKey: string | null = null;
    if (photo?.buffer?.length) {
      const stored = await this.storage.storePhoto(shopId, photo);
      photoKey = stored.storageKey;
    }

    return this.prisma.product.create({
      data: {
        id: productId,
        shopId,
        name: dto.name,
        price: new Prisma.Decimal(dto.price).toDecimalPlaces(2),
        photoKey,
        qrPayload,
        qrCodeKey,
      },
    });
  }

  async listByShop(shopId: string): Promise<Product[]> {
    await this.shopsService.findById(shopId);

    return this.prisma.product.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    return product;
  }

  private buildQrPayload(shopId: string, productId: string): string {
    const baseUrl =
      process.env.CATALOG_PUBLIC_BASE_URL ?? 'https://donypay.app/p';
    return `${baseUrl}/${shopId}/${productId}`;
  }
}
