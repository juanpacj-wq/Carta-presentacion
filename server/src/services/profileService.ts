import { randomUUID } from 'crypto';
import { getDb } from '../db.js';
import { Profile } from '../types/profile.js';

interface ProfileRow {
  id: string;
  name: string;
  position: string;
  email: string;
  phone: string | null;
  photoPath: string;
  createdAt: string;
  updatedAt: string;
}

const SELECT_COLUMNS = `
  id,
  name,
  position,
  email,
  phone,
  photo_path  AS photoPath,
  created_at  AS createdAt,
  updated_at  AS updatedAt
`;

function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    email: row.email,
    phone: row.phone,
    photoPath: row.photoPath,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export async function createProfile(data: {
  name: string;
  position: string;
  email: string;
  phone: string | null;
  photoPath: string;
}): Promise<Profile> {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO Profiles (id, name, position, email, phone, photo_path, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, data.name, data.position, data.email, data.phone, data.photoPath, now, now);

  const row = db
    .prepare(`SELECT ${SELECT_COLUMNS} FROM Profiles WHERE id = ?`)
    .get(id) as ProfileRow;

  return rowToProfile(row);
}

export async function getProfile(id: string): Promise<Profile | null> {
  const db = getDb();
  const row = db
    .prepare(`SELECT ${SELECT_COLUMNS} FROM Profiles WHERE id = ?`)
    .get(id) as ProfileRow | undefined;
  return row ? rowToProfile(row) : null;
}

export async function listProfiles(
  page = 1,
  pageSize = 50,
): Promise<{ data: Profile[]; total: number }> {
  const db = getDb();
  const cappedSize = Math.min(pageSize, 100);
  const offset = (page - 1) * cappedSize;

  const { total } = db.prepare('SELECT COUNT(*) AS total FROM Profiles').get() as {
    total: number;
  };

  const rows = db
    .prepare(
      `SELECT ${SELECT_COLUMNS}
       FROM Profiles
       ORDER BY name
       LIMIT ? OFFSET ?`,
    )
    .all(cappedSize, offset) as ProfileRow[];

  return { data: rows.map(rowToProfile), total };
}

export async function updateProfile(
  id: string,
  data: {
    name?: string;
    position?: string;
    email?: string;
    phone?: string | null;
    photoPath?: string;
  },
): Promise<Profile | null> {
  const db = getDb();

  const setClauses: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) {
    setClauses.push('name = ?');
    values.push(data.name);
  }
  if (data.position !== undefined) {
    setClauses.push('position = ?');
    values.push(data.position);
  }
  if (data.email !== undefined) {
    setClauses.push('email = ?');
    values.push(data.email);
  }
  if (data.phone !== undefined) {
    setClauses.push('phone = ?');
    values.push(data.phone);
  }
  if (data.photoPath !== undefined) {
    setClauses.push('photo_path = ?');
    values.push(data.photoPath);
  }

  if (setClauses.length === 0) return getProfile(id);

  setClauses.push('updated_at = ?');
  values.push(new Date().toISOString());

  values.push(id);

  const result = db
    .prepare(`UPDATE Profiles SET ${setClauses.join(', ')} WHERE id = ?`)
    .run(...values);

  if (result.changes === 0) return null;

  return getProfile(id);
}
