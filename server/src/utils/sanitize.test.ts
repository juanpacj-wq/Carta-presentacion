import { describe, it, expect } from 'vitest';
import { stripHtml, sanitizeData } from './sanitize.js';

describe('stripHtml', () => {
  it('removes simple tags', () => {
    expect(stripHtml('<b>hola</b>')).toBe('hola');
  });

  it('removes nested and self-closing tags', () => {
    expect(stripHtml('<div><img src="x"/>texto<span>!</span></div>')).toBe('texto!');
  });

  it('strips script tag contents markup but keeps the inner text', () => {
    // Intentional: the app stores these as plain text and never renders them as HTML,
    // so leaving inner text is fine; the goal is to neutralize markup.
    expect(stripHtml('<script>alert(1)</script>')).toBe('alert(1)');
  });

  it('trims whitespace', () => {
    expect(stripHtml('   <b>hola</b>   ')).toBe('hola');
  });

  it('returns empty string for only-tags input', () => {
    expect(stripHtml('<br/><hr/>')).toBe('');
  });

  it('passes through plain text unchanged', () => {
    expect(stripHtml('Juan Pérez')).toBe('Juan Pérez');
  });
});

describe('sanitizeData', () => {
  it('strips HTML only from whitelisted fields', () => {
    const input = {
      name: '<b>Juan</b>',
      position: 'Ingeniero<script>',
      phone: '<i>300</i>',
      email: '<b>no-touch@example.com</b>',
    };
    const output = sanitizeData(input);
    expect(output.name).toBe('Juan');
    expect(output.position).toBe('Ingeniero');
    expect(output.phone).toBe('300');
    // email is not in the whitelist — it must pass through untouched and be
    // validated instead by the zod email schema.
    expect(output.email).toBe('<b>no-touch@example.com</b>');
  });

  it('leaves non-string values alone', () => {
    const input = { name: 'Juan', position: 'Dev', phone: null };
    const output = sanitizeData(input);
    expect(output.phone).toBeNull();
  });

  it('does not mutate the input object', () => {
    const input = { name: '<b>Juan</b>' };
    const output = sanitizeData(input);
    expect(input.name).toBe('<b>Juan</b>');
    expect(output.name).toBe('Juan');
  });
});
