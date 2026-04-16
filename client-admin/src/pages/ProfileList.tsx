import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchProfiles, ProfileResponse } from '../api/profiles';
import QRCodeDisplay from '../components/QRCodeDisplay';

const PAGE_SIZE = 50;

export default function ProfileList() {
  const [profiles, setProfiles] = useState<ProfileResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [qrModal, setQrModal] = useState<{ id: string; name: string } | null>(null);

  const loadProfiles = useCallback((p: number) => {
    setLoading(true);
    fetchProfiles(p, PAGE_SIZE)
      .then((res) => {
        setProfiles(res.data);
        setTotal(res.total);
        setPage(p);
      })
      .catch(() => setError('Error al cargar los perfiles'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadProfiles(1);
  }, [loadProfiles]);

  if (loading) {
    return (
      <div style={styles.centerWrap}>
        <div style={styles.spinner} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centerWrap}>
        <div style={styles.errorCard}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" x2="19" y1="8" y2="14" />
            <line x1="22" x2="16" y1="11" y2="11" />
          </svg>
        </div>
        <h2 style={styles.emptyTitle}>No hay perfiles aun</h2>
        <p style={styles.emptyText}>Crea el primer perfil para comenzar</p>
        <Link to="/new" style={styles.emptyBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" x2="12" y1="5" y2="19" />
            <line x1="5" x2="19" y1="12" y2="12" />
          </svg>
          Crear Perfil
        </Link>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header row */}
      <div style={styles.listHeader}>
        <div>
          <h1 style={styles.pageTitle}>Perfiles</h1>
          <p style={styles.pageSubtitle}>{total} perfil{total !== 1 ? 'es' : ''} registrado{total !== 1 ? 's' : ''}</p>
        </div>
        <Link to="/new" style={styles.newBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" x2="12" y1="5" y2="19" />
            <line x1="5" x2="19" y1="12" y2="12" />
          </svg>
          Nuevo Perfil
        </Link>
      </div>

      {/* Profile grid */}
      <div style={styles.grid}>
        {profiles.map((p, i) => (
          <div
            key={p.id}
            style={{
              ...styles.card,
              animationDelay: `${i * 50}ms`,
            }}
          >
            {/* Card header with gradient accent */}
            <div style={styles.cardAccent} />

            <div style={styles.cardBody}>
              {/* Profile info row */}
              <div style={styles.profileRow}>
                <div style={styles.avatarWrap}>
                  <img
                    src={p.photoUrl}
                    alt={p.name}
                    style={styles.avatar}
                  />
                  <div style={styles.avatarRing} />
                </div>
                <div style={styles.profileInfo}>
                  <h3 style={styles.cardName}>{p.name}</h3>
                  <p style={styles.cardPosition}>{p.position}</p>
                </div>
              </div>

              {/* Contact details */}
              <div style={styles.contactDetails}>
                <div style={styles.contactRow}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2178bd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <span style={styles.contactText}>{p.email}</span>
                </div>
                {p.phone && (
                  <div style={styles.contactRow}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2178bd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <span style={styles.contactText}>{p.phone}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={styles.cardActions}>
                <a
                  href={`${import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin}/profile/${p.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.viewBtn}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" x2="21" y1="14" y2="3" />
                  </svg>
                  Ver Tarjeta
                </a>
                <Link to={`/edit/${p.id}`} style={styles.editBtn}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  </svg>
                  Editar
                </Link>
                <button
                  onClick={() => setQrModal({ id: p.id, name: p.name })}
                  style={styles.qrBtn}
                  title="Ver QR"
                >
                  <QRCodeDisplay profileId={p.id} size={36} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div style={styles.pagination}>
          <button
            onClick={() => loadProfiles(page - 1)}
            disabled={page <= 1}
            style={{ ...styles.pageBtn, opacity: page <= 1 ? 0.4 : 1 }}
          >
            Anterior
          </button>
          <span style={styles.pageInfo}>
            Pagina {page} de {Math.ceil(total / PAGE_SIZE)}
          </span>
          <button
            onClick={() => loadProfiles(page + 1)}
            disabled={page >= Math.ceil(total / PAGE_SIZE)}
            style={{ ...styles.pageBtn, opacity: page >= Math.ceil(total / PAGE_SIZE) ? 0.4 : 1 }}
          >
            Siguiente
          </button>
        </div>
      )}

      {/* QR Modal */}
      {qrModal && (
        <div
          style={styles.overlay}
          onClick={() => setQrModal(null)}
        >
          <div
            style={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setQrModal(null)}
              style={styles.modalClose}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" x2="6" y1="6" y2="18" />
                <line x1="6" x2="18" y1="6" y2="18" />
              </svg>
            </button>
            <h3 style={styles.modalName}>{qrModal.name}</h3>
            <QRCodeDisplay profileId={qrModal.id} size={220} />
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  centerWrap: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '300px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTopColor: '#023f86',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  errorCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: '#fef2f2',
    color: '#dc2626',
    padding: '16px 20px',
    borderRadius: '12px',
    fontSize: '0.95rem',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '80px 24px',
    animation: 'fadeIn 0.4s ease',
  },
  emptyIcon: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },
  emptyTitle: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: '8px',
  },
  emptyText: {
    color: '#64748b',
    marginBottom: '28px',
    fontSize: '0.95rem',
  },
  emptyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: '#023f86',
    color: '#fff',
    padding: '14px 28px',
    borderRadius: '12px',
    fontWeight: 600,
    textDecoration: 'none',
    fontSize: '0.95rem',
    transition: 'background 200ms ease',
    boxShadow: '0 4px 12px rgba(2,63,134,0.25)',
  },
  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '28px',
    flexWrap: 'wrap' as const,
    gap: '16px',
  },
  pageTitle: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  pageSubtitle: {
    fontSize: '0.875rem',
    color: '#64748b',
    marginTop: '2px',
  },
  newBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: '#023f86',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: '10px',
    fontWeight: 600,
    textDecoration: 'none',
    fontSize: '0.875rem',
    transition: 'background 200ms ease',
    boxShadow: '0 2px 8px rgba(2,63,134,0.2)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '20px',
  },
  card: {
    background: '#ffffff',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(2,63,134,0.06), 0 1px 2px rgba(2,63,134,0.04)',
    transition: 'box-shadow 250ms ease, transform 250ms ease',
    animation: 'fadeIn 0.4s ease backwards',
  },
  cardAccent: {
    height: '4px',
    background: 'linear-gradient(90deg, #023f86 0%, #2178bd 50%, #1f9c38 100%)',
  },
  cardBody: {
    padding: '20px 24px 24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  profileRow: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative' as const,
    flexShrink: 0,
  },
  avatar: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    objectFit: 'cover' as const,
    display: 'block',
  },
  avatarRing: {
    position: 'absolute' as const,
    inset: '-3px',
    borderRadius: '50%',
    border: '2px solid #2178bd',
    opacity: 0.3,
  },
  profileInfo: {
    minWidth: 0,
  },
  cardName: {
    fontSize: '1.05rem',
    fontWeight: 600,
    color: '#0f172a',
    lineHeight: 1.3,
  },
  cardPosition: {
    color: '#64748b',
    fontSize: '0.85rem',
    marginTop: '2px',
  },
  contactDetails: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    padding: '12px 16px',
    background: '#f8fafc',
    borderRadius: '10px',
  },
  contactRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  contactText: {
    fontSize: '0.83rem',
    color: '#475569',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  cardActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  viewBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.8rem',
    color: '#023f86',
    padding: '8px 14px',
    border: '1.5px solid #023f86',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 500,
    transition: 'all 200ms ease',
  },
  editBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.8rem',
    color: '#64748b',
    padding: '8px 14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 500,
    transition: 'all 200ms ease',
  },
  qrBtn: {
    marginLeft: 'auto',
    background: 'none',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    padding: '6px',
    cursor: 'pointer',
    transition: 'all 200ms ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    animation: 'fadeIn 0.2s ease',
  },
  modal: {
    background: '#ffffff',
    borderRadius: '20px',
    padding: '36px 40px 32px',
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '20px',
    boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
    maxWidth: '400px',
    width: '90%',
  },
  modalClose: {
    position: 'absolute' as const,
    top: '12px',
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#94a3b8',
    padding: '4px',
    borderRadius: '6px',
    display: 'flex',
    transition: 'color 150ms ease',
  },
  modalName: {
    fontSize: '1.2rem',
    fontWeight: 600,
    color: '#0f172a',
    textAlign: 'center' as const,
    margin: 0,
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginTop: '32px',
    paddingBottom: '24px',
  },
  pageBtn: {
    padding: '10px 20px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    background: '#ffffff',
    color: '#023f86',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  pageInfo: {
    fontSize: '0.875rem',
    color: '#64748b',
    fontWeight: 500,
  },
};
