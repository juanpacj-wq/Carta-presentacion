import { describe, it, expect } from 'vitest';
import { isValidImageMagic } from './imageValidation.js';

describe('isValidImageMagic', () => {
  it('accepts a JPEG header', () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(isValidImageMagic(buf)).toBe(true);
  });

  it('accepts a PNG header', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(isValidImageMagic(buf)).toBe(true);
  });

  it('accepts a WebP (RIFF) header', () => {
    const buf = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
    expect(isValidImageMagic(buf)).toBe(true);
  });

  it('rejects plain text even when the extension would say otherwise', () => {
    const buf = Buffer.from('hello world');
    expect(isValidImageMagic(buf)).toBe(false);
  });

  it('rejects a buffer shorter than 4 bytes', () => {
    expect(isValidImageMagic(Buffer.from([0xff]))).toBe(false);
    expect(isValidImageMagic(Buffer.alloc(0))).toBe(false);
  });

  it('rejects a GIF (not in whitelist)', () => {
    const buf = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // GIF89a
    expect(isValidImageMagic(buf)).toBe(false);
  });

  it('rejects a PE/EXE header', () => {
    const buf = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // MZ
    expect(isValidImageMagic(buf)).toBe(false);
  });
});
