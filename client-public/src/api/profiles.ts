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

export async function fetchProfile(id: string): Promise<ProfileResponse> {
  const res = await fetch(`/api/profiles/${id}`);
  if (!res.ok) throw new Error('Perfil no encontrado');
  return res.json();
}
