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
import { CatalogService } from './catalog.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateShopDto } from './dto/create-shop.dto';
import { ProductsService } from './products.service';
import { ShopsService } from './shops.service';

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

@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly shopsService: ShopsService,
    private readonly productsService: ProductsService,
  ) {}

  @Get('hello')
  getHello() {
    return this.catalogService.getHello();
  }

  @Post('shops')
  createShop(@Body() dto: CreateShopDto) {
    return this.shopsService.create(dto);
  }

  @Get('shops/:id')
  getShop(@Param('id', ParseUUIDPipe) id: string) {
    return this.shopsService.findById(id);
  }

  @Get('sellers/:sellerId/shop')
  getShopBySeller(@Param('sellerId', ParseUUIDPipe) sellerId: string) {
    return this.shopsService.findBySellerId(sellerId);
  }

  @Post('shops/:shopId/products')
  @UseInterceptors(FileInterceptor('photo', uploadOptions))
  createProduct(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Body() dto: CreateProductDto,
    @UploadedFile() photo?: UploadedMulterFile,
  ) {
    return this.productsService.create(
      shopId,
      dto,
      photo
        ? {
            buffer: photo.buffer,
            originalName: photo.originalname,
            mimeType: photo.mimetype,
            sizeBytes: photo.size,
          }
        : undefined,
    );
  }

  @Get('shops/:shopId/products')
  listProducts(@Param('shopId', ParseUUIDPipe) shopId: string) {
    return this.productsService.listByShop(shopId);
  }

  @Get('products/:id')
  getProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findById(id);
  }
}
