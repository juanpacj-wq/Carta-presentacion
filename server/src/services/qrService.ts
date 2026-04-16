import QRCode from 'qrcode';
import { config } from '../config.js';

export async function generateQR(profileId: string): Promise<Buffer> {
  const url = `${config.publicBaseUrl}/profile/${profileId}`;
  return QRCode.toBuffer(url, {
    type: 'png',
    width: 400,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });
}
