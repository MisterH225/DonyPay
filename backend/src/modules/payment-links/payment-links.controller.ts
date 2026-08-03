import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';
import { PaymentLinksService } from './payment-links.service';

@Controller('payment-links')
export class PaymentLinksController {
  constructor(private readonly paymentLinksService: PaymentLinksService) {}

  @Get('hello')
  getHello() {
    return this.paymentLinksService.getHello();
  }

  /**
   * Crée un lien à usage unique pour une échéance et initie la collecte
   * Mobile Money (HMAC webhook) sur le compte ledger du goal.
   */
  @Post()
  create(@Body() dto: CreatePaymentLinkDto) {
    return this.paymentLinksService.create(dto);
  }

  /**
   * Page / payload public sans compte.
   * `Accept: text/html` → HTML minimal, sinon JSON.
   */
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
  @Get('public/:token/page')
  async getPublicHtmlPage(@Param('token') token: string, @Res() res: Response) {
    const page = await this.paymentLinksService.getPublicPage(token);
    res
      .status(200)
      .type('html')
      .send(this.paymentLinksService.renderPublicHtml(page));
  }
}
