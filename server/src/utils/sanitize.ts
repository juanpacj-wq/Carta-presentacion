// Minimal string sanitization helpers used when receiving user-provided text.
// NOT a full HTML sanitizer — the app never renders these strings as HTML,
// it only stores them as plain text. The goal is to reject anything that
// looks like markup before persistence so it can't be reflected later.

export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim();
}

const SANITIZED_FIELDS = ['name', 'position', 'phone'] as const;
type SanitizedField = (typeof SANITIZED_FIELDS)[number];

export function sanitizeData<T extends Partial<Record<SanitizedField, unknown>>>(data: T): T {
  const result = { ...data };
  for (const key of SANITIZED_FIELDS) {
    const current = result[key];
    if (typeof current === 'string') {
      (result as Record<string, unknown>)[key] = stripHtml(current);
    }
  }
  return result;
}
