import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { QrCodePort } from '../ports/qr-code.port';

@Injectable()
export class QrCodeGeneratorAdapter implements QrCodePort {
  async generatePng(payload: string): Promise<Buffer> {
    return QRCode.toBuffer(payload, {
      type: 'png',
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 512,
    });
  }
}
