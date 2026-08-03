export const QR_CODE_PORT = Symbol('QR_CODE_PORT');

/** Génération de QR codes produits. */
export interface QrCodePort {
  /** Retourne un PNG du QR encodant `payload`. */
  generatePng(payload: string): Promise<Buffer>;
}
