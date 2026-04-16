import { useRef, useState, useEffect, DragEvent } from 'react';

interface PhotoUploadProps {
  currentPhotoUrl?: string;
  onFileSelect: (file: File) => void;
}

export default function PhotoUpload({ currentPhotoUrl, onFileSelect }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl || null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (currentPhotoUrl) setPreview(currentPhotoUrl);
  }, [currentPhotoUrl]);

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    onFileSelect(file);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div style={styles.container}>
      {/* Decorative ring */}
      <div style={{
        ...styles.outerRing,
        ...(dragging ? styles.outerRingDragging : {}),
      }} />

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          ...styles.circle,
          ...(dragging ? styles.circleDragging : {}),
          ...(preview ? styles.circleWithPreview : {}),
        }}
      >
        {preview ? (
          <img src={preview} alt="Preview" style={styles.previewImg} />
        ) : (
          <div style={styles.placeholder}>
            <div style={styles.iconWrap}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <span style={styles.placeholderText}>Subir foto</span>
            <span style={styles.placeholderHint}>JPG, PNG o WebP</span>
          </div>
        )}
      </div>

      {/* Camera button overlay */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={styles.cameraBtn}
        aria-label="Cambiar foto"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '160px',
    height: '160px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    inset: '-4px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #023f86, #2178bd, #1f9c38)',
    opacity: 0.15,
    transition: 'opacity 300ms ease, transform 300ms ease',
    pointerEvents: 'none',
  },
  outerRingDragging: {
    opacity: 0.35,
    transform: 'scale(1.05)',
  },
  circle: {
    position: 'relative',
    width: '148px',
    height: '148px',
    borderRadius: '50%',
    border: '3px dashed #cbd5e1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    overflow: 'hidden',
    background: '#f8fafc',
    transition: 'all 250ms ease',
    zIndex: 1,
  },
  circleDragging: {
    borderColor: '#2178bd',
    borderStyle: 'dashed',
    background: '#eff6ff',
    transform: 'scale(1.02)',
  },
  circleWithPreview: {
    border: '3px solid #e2e8f0',
    borderStyle: 'solid',
  },
  previewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '16px',
  },
  iconWrap: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '4px',
  },
  placeholderText: {
    color: '#64748b',
    fontSize: '0.8rem',
    fontWeight: 600,
    letterSpacing: '0.01em',
  },
  placeholderHint: {
    color: '#94a3b8',
    fontSize: '0.68rem',
    fontWeight: 400,
  },
  cameraBtn: {
    position: 'absolute',
    bottom: '4px',
    right: '8px',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #023f86, #2178bd)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(2, 63, 134, 0.3)',
    border: '3px solid #ffffff',
    cursor: 'pointer',
    zIndex: 2,
    transition: 'transform 200ms ease, box-shadow 200ms ease',
  },
};
