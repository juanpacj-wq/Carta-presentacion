import { getCsrfToken } from '../auth/authClient';

export interface ProfileResponse {
  id: string;
  name: string;
  position: string;
  email: string;
  phone: string | null;
  photoUrl: string;
  qrUrl: string;
  createdAt: string;
  updatedAt: string;
}

const BASE = '/api/profiles';

export interface PaginatedResponse {
  data: ProfileResponse[];
  total: number;
  page: number;
  pageSize: number;
}

function csrfHeaders(): HeadersInit {
  const token = getCsrfToken();
  return token ? { 'X-CSRF-Token': token } : {};
}

function ensureOk(res: Response): void {
  if (res.status === 401 || res.status === 403) {
    // Sesion caducada o CSRF roto: recarga para forzar login.
    window.location.reload();
  }
}

export async function fetchProfiles(page = 1, pageSize = 50): Promise<PaginatedResponse> {
  const res = await fetch(`${BASE}?page=${page}&pageSize=${pageSize}`, {
    credentials: 'include',
  });
  ensureOk(res);
  if (!res.ok) throw new Error('Error al cargar perfiles');
  return res.json();
}

export async function fetchProfile(id: string): Promise<ProfileResponse> {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error('Perfil no encontrado');
  return res.json();
}

export async function createProfile(data: FormData): Promise<ProfileResponse> {
  const res = await fetch(BASE, {
    method: 'POST',
    credentials: 'include',
    body: data,
    headers: csrfHeaders(),
  });
  ensureOk(res);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error al crear perfil' }));
    throw new Error(err.error || 'Error al crear perfil');
  }
  return res.json();
}

export async function updateProfile(id: string, data: FormData): Promise<ProfileResponse> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    credentials: 'include',
    body: data,
    headers: csrfHeaders(),
  });
  ensureOk(res);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error al actualizar perfil' }));
    throw new Error(err.error || 'Error al actualizar perfil');
  }
  return res.json();
}
