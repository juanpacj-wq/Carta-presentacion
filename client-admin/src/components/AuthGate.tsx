import { FormEvent, ReactNode, useState } from 'react';
import { useAuth } from '../auth/AuthContext';

export default function AuthGate({ children }: { children: ReactNode }) {
  const { authenticated, loading, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.card}>
          <p style={styles.subtitle}>Cargando...</p>
        </div>
      </div>
    );
  }

  if (authenticated) {
    return <>{children}</>;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesion';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={styles.wrapper}>
      <form style={styles.card} onSubmit={handleSubmit} autoComplete="on">
        <div style={styles.iconWrap}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#023f86" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h2 style={styles.title}>Acceso restringido</h2>
        <p style={styles.subtitle}>Ingresa tus credenciales para administrar perfiles.</p>

        {error && <div style={styles.error} role="alert">{error}</div>}

        <label style={styles.label} htmlFor="username">Usuario</label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          autoFocus
          disabled={busy}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={styles.input}
        />

        <label style={styles.label} htmlFor="password">Contrasena</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={busy}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />

        <button type="submit" disabled={busy || !username || !password} style={styles.button}>
          {busy ? 'Iniciando sesion...' : 'Iniciar sesion'}
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',
    padding: '20px',
  },
  card: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '40px 32px',
    maxWidth: '420px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
  },
  iconWrap: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    background: '#eff6ff',
    marginBottom: '16px',
    alignSelf: 'center',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 4px',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: '0 0 24px',
    lineHeight: 1.5,
  },
  error: {
    background: '#fef2f2',
    color: '#dc2626',
    padding: '10px 14px',
    borderRadius: '10px',
    fontSize: '0.85rem',
    fontWeight: 500,
    marginBottom: '12px',
    textAlign: 'left',
  },
  label: {
    display: 'block',
    textAlign: 'left',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    fontSize: '0.95rem',
    marginBottom: '14px',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '14px',
    background: '#023f86',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '8px',
  },
};
