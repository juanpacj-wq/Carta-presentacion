import { QRCode } from 'react-qrcode-logo';
import { useRef, useCallback } from 'react';

interface QRCodeDisplayProps {
  profileId: string;
  size?: number;
}

export default function QRCodeDisplay({ profileId, size = 180 }: QRCodeDisplayProps) {
  const publicBase = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin;
  const url = `${publicBase}/profile/${profileId}`;
  const isSmall = size <= 80;
  const logoSize = Math.round(size * 0.22);
  const qrRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(() => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;

    const padding = 24;
    const downloadSize = 400;
    const scale = downloadSize / size;
    const canvasSize = downloadSize + padding * 2;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvasSize;
    exportCanvas.height = canvasSize;
    const ctx = exportCanvas.getContext('2d')!;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Draw the QR canvas (already has logo and styling)
    ctx.drawImage(canvas, padding, padding, downloadSize, downloadSize);

    const link = document.createElement('a');
    link.download = `qr-${profileId}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  }, [profileId, size]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: isSmall ? '4px' : '12px',
    }}>
      <div
        ref={qrRef}
        style={{
          padding: isSmall ? '4px' : '12px',
          background: '#ffffff',
          borderRadius: isSmall ? '6px' : '12px',
          border: '1px solid #e2e8f0',
        }}
      >
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
      </div>
      {!isSmall && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownload();
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8rem',
            color: '#023f86',
            background: 'none',
            cursor: 'pointer',
            padding: '8px 14px',
            border: '1.5px solid #023f86',
            borderRadius: '8px',
            fontWeight: 500,
            transition: 'all 200ms ease',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
          </svg>
          Descargar QR
        </button>
      )}
    </div>
  );
}
