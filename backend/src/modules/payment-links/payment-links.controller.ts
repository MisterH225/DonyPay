import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';
import { MobileMoneyCallbackDto } from './dto/mobile-money-callback.dto';
import { PaymentLinksService } from './payment-links.service';

@Controller('payment-links')
export class PaymentLinksController {
  constructor(private readonly paymentLinksService: PaymentLinksService) {}

  @Public()
  @Get('hello')
  getHello() {
    return this.paymentLinksService.getHello();
  }

  /** Crée un lien à usage unique pour une échéance (montant figé, TTL 48h). */
  @Post()
  create(@Body() dto: CreatePaymentLinkDto) {
    return this.paymentLinksService.create(dto);
  }

  /**
   * Page / payload public sans compte.
   * `Accept: text/html` → HTML minimal, sinon JSON.
   */
  @Public()
  @Get('public/:token')
  async getPublic(
    @Param('token') token: string,
    @Req() req: { headers: { accept?: string } },
    @Res() res: Response,
  ) {
    const page = await this.paymentLinksService.getPublicPage(token);
    const accept = req.headers.accept ?? '';

    if (accept.includes('text/html')) {
      res
        .status(200)
        .type('html')
        .send(this.paymentLinksService.renderPublicHtml(page));
      return;
    }

    res.status(200).json(page);
  }

  /** Alias HTML explicite pour ouverture navigateur. */
  @Public()
  @Get('public/:token/page')
  async getPublicHtmlPage(@Param('token') token: string, @Res() res: Response) {
    const page = await this.paymentLinksService.getPublicPage(token);
    res
      .status(200)
      .type('html')
      .send(this.paymentLinksService.renderPublicHtml(page));
  }

  /** Callback prestataire mobile money (legacy — préférer webhook HMAC). */
  @Public()
  @Post('public/:token/callback')
  handleCallback(
    @Param('token') token: string,
    @Body() dto: MobileMoneyCallbackDto,
  ) {
    return this.paymentLinksService.handleMobileMoneyCallback(token, dto);
  }
}
