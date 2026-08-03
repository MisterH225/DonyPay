import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { CatalogStoragePort } from './ports/catalog-storage.port';
import type { QrCodePort } from './ports/qr-code.port';
import { ProductsService } from './products.service';
import { ShopsService } from './shops.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let products: Array<Record<string, unknown>>;
  let prisma: {
    product: { create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock };
  };
  let shopsService: ShopsService;
  let storage: CatalogStoragePort;
  let qrCode: QrCodePort;

  beforeEach(() => {
    products = [];
    prisma = {
      product: {
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const product = {
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          };
          products.push(product);
          return product;
        }),
        findMany: jest.fn(async ({ where }: { where: { shopId: string } }) => {
          return products.filter((product) => product.shopId === where.shopId);
        }),
        findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
          return products.find((product) => product.id === where.id) ?? null;
        }),
      },
    };

    shopsService = {
      findById: jest.fn(async (id: string) => ({
        id,
        sellerId: 'seller-1',
        name: 'Boutique',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    } as unknown as ShopsService;

    storage = {
      storePhoto: jest.fn(async () => ({
        storageKey: 'shop-1/photos/photo.jpg',
        originalName: 'photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 4,
      })),
      storeQrImage: jest.fn(async (_shopId, productId) => {
        return `shop-1/qr/${productId}.png`;
      }),
    };

    qrCode = {
      generatePng: jest.fn(async () => Buffer.from('png')),
    };

    service = new ProductsService(
      prisma as unknown as PrismaService,
      shopsService,
      storage,
      qrCode,
    );
  });

  it('creates a product with photo and generated QR code', async () => {
    const product = await service.create(
      'shop-1',
      { name: 'Sneakers', price: 79.9 },
      {
        buffer: Buffer.from('img'),
        originalName: 'photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 3,
      },
    );

    expect(product.name).toBe('Sneakers');
    expect(product.price).toEqual(new Prisma.Decimal('79.9'));
    expect(product.photoKey).toBe('shop-1/photos/photo.jpg');
    expect(product.qrCodeKey).toContain('shop-1/qr/');
    expect(product.qrPayload).toContain('shop-1');
    expect(qrCode.generatePng).toHaveBeenCalledWith(product.qrPayload);
    expect(storage.storeQrImage).toHaveBeenCalled();
  });

  it('lists products by shop', async () => {
    await service.create('shop-1', { name: 'A', price: 10 });
    await service.create('shop-1', { name: 'B', price: 20 });

    const list = await service.listByShop('shop-1');
    expect(list).toHaveLength(2);
    expect(shopsService.findById).toHaveBeenCalledWith('shop-1');
  });

  it('throws when product is missing', async () => {
    await expect(service.findById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
