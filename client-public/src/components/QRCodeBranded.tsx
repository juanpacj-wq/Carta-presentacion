import { QRCode } from 'react-qrcode-logo';

interface Props {
  profileId: string;
  size?: number;
}

export default function QRCodeBranded({ profileId, size = 200 }: Props) {
  const publicBase = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin;
  const url = `${publicBase}/profile/${profileId}`;
  const logoSize = Math.round(size * 0.22);
  return (
    <QRCode
      value={url}
      size={size}
      ecLevel="H"
      qrStyle="dots"
      fgColor="#023f86"
      eyeRadius={[
        { outer: [10, 10, 0, 10], inner: [4, 4, 4, 4] },
        { outer: [10, 10, 10, 0], inner: [4, 4, 4, 4] },
        { outer: [0, 10, 10, 10], inner: [4, 4, 4, 4] },
      ]}
      eyeColor="#023f86"
      logoImage="/favicon.ico"
      logoWidth={logoSize}
      logoHeight={logoSize}
      logoPaddingStyle="circle"
      logoPadding={5}
      removeQrCodeBehindLogo
      quietZone={0}
    />
  );
}
