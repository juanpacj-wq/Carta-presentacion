import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Layout() {
  const location = useLocation();
  const { username, logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;
  const isNewOrEdit = isActive('/new') || location.pathname.startsWith('/edit');

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: '#f0f4f8' }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #012b5c 0%, #023f86 50%, #0a4f9e 100%)',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '56px',
        boxShadow: '0 4px 20px rgba(2,43,92,0.35)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '14px', textDecoration: 'none' }}>
          <img src={`${import.meta.env.BASE_URL}assets/gecelca-blanco.png`} alt="GECELCA" style={{ height: '34px', width: 'auto' }} />
          <div style={{
            width: '1px',
            height: '24px',
            background: 'rgba(255,255,255,0.25)',
          }} />
          <span style={{
            color: 'rgba(255,255,255,0.9)',
            fontSize: '1.05rem',
            fontWeight: 500,
            letterSpacing: '0.03em',
          }}>
            Comunicaciones
          </span>
        </Link>

        <nav style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <Link
            to="/"
            style={{
              padding: '6px 14px',
              background: isActive('/') ? 'rgba(255,255,255,0.18)' : 'transparent',
              color: isActive('/') ? '#ffffff' : 'rgba(255,255,255,0.75)',
              textDecoration: 'none',
              fontSize: '0.8125rem',
              fontWeight: isActive('/') ? 600 : 500,
              transition: 'all 150ms ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderBottom: isActive('/') ? '2px solid rgba(255,255,255,0.8)' : '2px solid transparent',
              borderRadius: '6px 6px 2px 2px',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Perfiles
          </Link>
          <Link
            to="/new"
            style={{
              padding: '6px 14px',
              borderRadius: '6px 6px 2px 2px',
              background: isNewOrEdit ? 'rgba(255,255,255,0.18)' : 'transparent',
              color: isNewOrEdit ? '#ffffff' : 'rgba(255,255,255,0.75)',
              textDecoration: 'none',
              fontSize: '0.8125rem',
              fontWeight: isNewOrEdit ? 600 : 500,
              transition: 'all 150ms ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderBottom: isNewOrEdit ? '2px solid rgba(255,255,255,0.8)' : '2px solid transparent',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" x2="12" y1="5" y2="19" />
              <line x1="5" x2="19" y1="12" y2="12" />
            </svg>
            Nuevo
          </Link>
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.25)', margin: '0 8px' }} />
          {username && (
            <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8125rem' }}>
              {username}
            </span>
          )}
          <button
            type="button"
            onClick={() => { void logout(); }}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              color: 'rgba(255,255,255,0.85)',
              border: '1px solid rgba(255,255,255,0.35)',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cerrar sesion
          </button>
        </nav>
      </header>

      {/* Main content */}
      <main style={{
        flex: 1,
        padding: '32px 24px',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
      }}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '16px',
        color: '#94a3b8',
        fontSize: '0.75rem',
        borderTop: '1px solid #e2e8f0',
      }}>
        GECELCA - Comunicaciones
      </footer>
    </div>
  );
}
