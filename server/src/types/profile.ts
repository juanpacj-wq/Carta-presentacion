export interface Profile {
  id: string;
  name: string;
  position: string;
  email: string;
  phone: string | null;
  photoPath: string;
  createdAt: Date;
  updatedAt: Date;
}

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
