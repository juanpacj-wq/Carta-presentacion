// Mini parser/serializer de cookies. Evitamos anadir cookie-parser ya que
// solo necesitamos read-by-name y set con atributos seguros.

export function parseCookieHeader(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const name = part.slice(0, idx).trim();
    if (!name) continue;
    const value = part.slice(idx + 1).trim();
    try {
      out[name] = decodeURIComponent(value);
    } catch {
      out[name] = value;
    }
  }
  return out;
}

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  path?: string;
  maxAgeSeconds?: number;
  expires?: Date;
}

function encodeValue(value: string): string {
  return encodeURIComponent(value);
}

// Cookie value must not contain control chars, semicolons, or whitespace
// that would break the Set-Cookie header. encodeURIComponent handles this.
export function serializeCookie(name: string, value: string, opts: CookieOptions = {}): string {
  // __Host- prefix: debe incluir Secure, Path=/ y no Domain.
  const isHostPrefix = name.startsWith('__Host-');
  const path = opts.path ?? '/';
  const secure = isHostPrefix ? true : opts.secure ?? false;
  if (isHostPrefix && path !== '/') {
    throw new Error('__Host- cookies must use Path=/');
  }
  const parts: string[] = [`${name}=${encodeValue(value)}`];
  parts.push(`Path=${path}`);
  if (opts.maxAgeSeconds !== undefined) parts.push(`Max-Age=${Math.floor(opts.maxAgeSeconds)}`);
  if (opts.expires) parts.push(`Expires=${opts.expires.toUTCString()}`);
  if (opts.httpOnly) parts.push('HttpOnly');
  if (secure) parts.push('Secure');
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  return parts.join('; ');
}
