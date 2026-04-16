// Cliente minimo para la autenticacion local. Maneja login/logout/estado
// usando cookies (credentials: 'include') + header CSRF.

export interface SessionInfo {
  authenticated: boolean;
  username?: string;
  csrfToken?: string;
}

const BASE = '/api/auth';

function readCookie(name: string): string | null {
  const target = name + '=';
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(target)) {
      try {
        return decodeURIComponent(trimmed.slice(target.length));
      } catch {
        return trimmed.slice(target.length);
      }
    }
  }
  return null;
}

// El backend usa `__Host-csrf` en prod y `csrf` en dev. Probamos ambos.
export function getCsrfToken(): string | null {
  return readCookie('__Host-csrf') || readCookie('csrf');
}

export async function login(username: string, password: string): Promise<SessionInfo> {
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    let message = 'Usuario o contrasena incorrectos';
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    const err = new Error(message);
    (err as Error & { status: number }).status = res.status;
    throw err;
  }
  const body = await res.json();
  return { authenticated: true, username: body.username, csrfToken: body.csrfToken };
}

export async function logout(): Promise<void> {
  await fetch(`${BASE}/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function fetchSession(): Promise<SessionInfo> {
  try {
    const res = await fetch(`${BASE}/me`, { credentials: 'include' });
    if (!res.ok) return { authenticated: false };
    const body = await res.json();
    return {
      authenticated: !!body.authenticated,
      username: body.username,
      csrfToken: body.csrfToken,
    };
  } catch {
    return { authenticated: false };
  }
}
