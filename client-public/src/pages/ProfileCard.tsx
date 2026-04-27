import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { fetchProfile, ProfileResponse } from '../api/profiles';
import QRCodeBranded from '../components/QRCodeBranded';

export default function ProfileCard() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showQR, setShowQR] = useState(false);

  const qrTriggerRef = useRef<HTMLButtonElement>(null);
  const qrCloseBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!id) return;
    fetchProfile(id)
      .then(setProfile)
      .catch(() => setError('Perfil no encontrado'))
      .finally(() => setLoading(false));
  }, [id]);

  // Titulo dinamico (WCAG 2.4.2)
  useEffect(() => {
    if (profile) {
      document.title = `${profile.name} - ${profile.position} - GECELCA`;
    } else if (error) {
      document.title = 'Perfil no encontrado - GECELCA';
    } else {
      document.title = 'Cargando perfil - GECELCA';
    }
  }, [profile, error]);

  // Manejo de foco y tecla Escape para el modal QR (WCAG 2.1.1, 2.1.2, 2.4.3)
  useEffect(() => {
    if (!showQR) return;
    qrCloseBtnRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowQR(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      qrTriggerRef.current?.focus();
    };
  }, [showQR]);

  function generateVCard(p: ProfileResponse) {
    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${p.name}`,
      `TITLE:${p.position}`,
      `EMAIL:${p.email}`,
      p.phone ? `TEL:${p.phone}` : '',
      `ORG:GECELCA`,
      `URL:${window.location.href}`,
      'END:VCARD',
    ].filter(Boolean).join('\n');

    const blob = new Blob([vcard], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${p.name.replace(/\s+/g, '_')}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div style={styles.loadingScreen} role="status" aria-live="polite" aria-busy="true">
        <div style={styles.spinner} aria-hidden="true" />
        <span className="sr-only">Cargando perfil</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={styles.loadingScreen} role="alert" aria-live="assertive">
        <p style={{ color: '#ffffff', fontSize: '1rem' }}>{error || 'Perfil no encontrado'}</p>
      </div>
    );
  }

  return (
    <main style={styles.page}>
      {/* Geometric background shapes */}
      <div style={styles.bgShape1} />
      <div style={styles.bgShape2} />
      <div style={styles.bgShape3} />
      <div style={styles.bgShape4} />

      {/* Main content */}
      <div style={styles.container}>
        {/* Hero card with photo */}
        <div style={styles.heroCard}>
          <img
            src={profile.photoUrl}
            alt={`imagen ${profile.name}`}
            style={styles.heroPhoto}
          />
          {/* Gradient overlay */}
          <div style={styles.heroOverlay} />
          {/* Text overlay */}
          <div style={styles.heroContent}>
            <h1 style={styles.heroName}>{profile.name}</h1>
            <p style={styles.heroPosition}>{profile.position}</p>
            <img
              src="/assets/gecelca-blanco.png"
              alt="Logo de GECELCA"
              style={styles.heroLogo}
            />
            {/* Action buttons */}
            <div style={styles.actionRow}>
              {profile.phone && (
                <a href={`tel:${profile.phone}`} style={styles.actionBtn} aria-label={`Llamar a ${profile.name}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </a>
              )}
              <a href={`mailto:${profile.email}`} style={styles.actionBtn} aria-label={`Enviar correo a ${profile.name}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Contact info section */}
        <div style={styles.infoCard}>
          <div style={styles.infoHeader}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#023f86" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <path d="M17 18a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2" />
              <rect width="18" height="18" x="3" y="4" rx="2" />
              <circle cx="12" cy="10" r="2" />
              <line x1="8" x2="8" y1="2" y2="4" />
              <line x1="16" x2="16" y1="2" y2="4" />
            </svg>
            <span style={styles.infoHeaderText}>Contacto</span>
          </div>

          {profile.phone && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Telefono</span>
              <a href={`tel:${profile.phone}`} style={styles.infoValue}>{profile.phone}</a>
            </div>
          )}

          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Email</span>
            <a href={`mailto:${profile.email}`} style={styles.infoValue}>{profile.email}</a>
          </div>
        </div>

        {/* Website section */}
        <div style={styles.infoCard}>
          <p style={styles.webTitle}>Pagina Web</p>
          <a
            href="https://www.gecelca.com.co/es/"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.webLink}
            aria-label="Abrir sitio web de GECELCA en una nueva pestana"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#023f86" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <span>GECELCA</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto' }} aria-hidden="true" focusable="false">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </a>
        </div>

      </div>

      {/* Floating buttons */}
      <div style={styles.floatingLeft}>
        <button
          ref={qrTriggerRef}
          onClick={() => setShowQR(true)}
          style={styles.floatingBtn}
          aria-label="Mostrar codigo QR del perfil"
          aria-haspopup="dialog"
          aria-expanded={showQR}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <rect x="2" y="2" width="8" height="8" rx="1" />
            <rect x="14" y="2" width="8" height="8" rx="1" />
            <rect x="2" y="14" width="8" height="8" rx="1" />
            <rect x="14" y="14" width="4" height="4" />
            <line x1="22" y1="14" x2="22" y2="14.01" />
            <line x1="22" y1="22" x2="22" y2="22.01" />
            <line x1="18" y1="18" x2="18" y2="18.01" />
          </svg>
        </button>
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: profile.name, url: window.location.href });
            } else {
              navigator.clipboard.writeText(window.location.href);
            }
          }}
          style={styles.floatingBtn}
          aria-label="Compartir enlace del perfil"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
      </div>

      <button
        onClick={() => generateVCard(profile)}
        style={styles.floatingRight}
        aria-label={`Guardar contacto de ${profile.name}`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" x2="19" y1="8" y2="14" />
          <line x1="22" x2="16" y1="11" y2="11" />
        </svg>
        <span style={styles.floatingRightLabel}>Guardar<br/>contacto</span>
      </button>

      {/* QR Modal */}
      {showQR && (
        <div
          style={styles.qrOverlay}
          onClick={() => setShowQR(false)}
          aria-hidden="true"
        >
          <div
            style={styles.qrModal}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-dialog-title"
          >
            <button
              ref={qrCloseBtnRef}
              style={styles.qrCloseBtn}
              onClick={() => setShowQR(false)}
              aria-label="Cerrar"
              type="button"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <h2 id="qr-dialog-title" style={styles.qrTitle}>{profile.name}</h2>
            <div
              style={styles.qrImageWrap}
              role="img"
              aria-label={`Codigo QR del perfil de ${profile.name}`}
            >
              <QRCodeBranded profileId={id!} size={200} />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100dvh',
    background: '#023f86',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '24px 16px',
  },
  bgShape1: {
    position: 'absolute',
    width: '280px',
    height: '200px',
    background: '#2178bd',
    borderRadius: '16px',
    top: '10%',
    left: '-60px',
    transform: 'rotate(-12deg)',
    opacity: 0.5,
  },
  bgShape2: {
    position: 'absolute',
    width: '220px',
    height: '160px',
    background: '#2178bd',
    borderRadius: '12px',
    top: '5%',
    right: '-40px',
    transform: 'rotate(8deg)',
    opacity: 0.4,
  },
  bgShape3: {
    position: 'absolute',
    width: '300px',
    height: '220px',
    background: '#2178bd',
    borderRadius: '18px',
    bottom: '15%',
    right: '-80px',
    transform: 'rotate(-6deg)',
    opacity: 0.35,
  },
  bgShape4: {
    position: 'absolute',
    width: '180px',
    height: '140px',
    background: '#2178bd',
    borderRadius: '10px',
    bottom: '8%',
    left: '-30px',
    transform: 'rotate(15deg)',
    opacity: 0.3,
  },
  container: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: '420px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    animation: 'slideUp 0.5s ease',
  },
  heroCard: {
    position: 'relative',
    width: '100%',
    aspectRatio: '3 / 4',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  heroPhoto: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  heroOverlay: {
    position: 'absolute',
    inset: 0,
    // Zona de texto (0-45%) totalmente opaca para garantizar contraste AA medible.
    background: 'linear-gradient(to top, #000000 0%, #000000 45%, rgba(0,0,0,0.6) 60%, transparent 80%)',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '32px 24px 24px',
  },
  heroName: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#ffffff',
    lineHeight: 1.2,
    marginBottom: '4px',
    textShadow: '0 1px 3px rgba(0,0,0,0.6)',
  },
  heroPosition: {
    fontSize: '0.9rem',
    color: '#ffffff',
    fontWeight: 500,
    marginBottom: '16px',
    lineHeight: 1.4,
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
  },
  heroLogo: {
    height: '60px',
    width: 'auto',
    marginBottom: '20px',
    opacity: 0.95,
    display: 'block',
  },
  actionRow: {
    display: 'flex',
    gap: '12px',
  },
  actionBtn: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 250ms ease',
    border: '1px solid rgba(255,255,255,0.25)',
  },
  infoCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '20px 24px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  },
  infoHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #e2e8f0',
  },
  infoHeaderText: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#023f86',
  },
  infoRow: {
    marginBottom: '12px',
  },
  infoLabel: {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 500,
    color: '#64748b',
    marginBottom: '2px',
  },
  infoValue: {
    fontSize: '0.95rem',
    color: '#1e293b',
    textDecoration: 'none',
    fontWeight: 400,
  },
  webTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#023f86',
    textAlign: 'center',
    marginBottom: '12px',
  },
  webLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    background: '#f8fafc',
    borderRadius: '12px',
    color: '#1e293b',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: 500,
    transition: 'background 250ms ease',
  },
  floatingLeft: {
    position: 'fixed',
    bottom: '24px',
    left: '24px',
    display: 'flex',
    flexDirection: 'row',
    gap: '12px',
    zIndex: 10,
  },
  floatingBtn: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: 'rgba(30, 30, 30, 0.9)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
    transition: 'transform 150ms ease, background 250ms ease',
  },
  floatingRight: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    height: '52px',
    padding: '0 18px 0 14px',
    borderRadius: '26px',
    background: 'rgba(30, 30, 30, 0.9)',
    color: '#ffffff',
    border: '1px solid rgba(255,255,255,0.12)',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
    transition: 'transform 150ms ease, background 250ms ease',
    zIndex: 10,
  },
  floatingRightLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    lineHeight: 1.2,
    textAlign: 'left' as const,
  },
  qrOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  qrModal: {
    background: '#ffffff',
    borderRadius: '20px',
    padding: '32px 28px',
    textAlign: 'center' as const,
    position: 'relative' as const,
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  qrCloseBtn: {
    position: 'absolute' as const,
    top: '12px',
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#64748b',
    padding: '4px',
  },
  qrTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: '#023f86',
    marginBottom: '16px',
  },
  qrImageWrap: {
    display: 'flex',
    justifyContent: 'center',
    padding: '12px',
    background: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  loadingScreen: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100dvh',
    background: '#023f86',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(255,255,255,0.2)',
    borderTopColor: '#ffffff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};
