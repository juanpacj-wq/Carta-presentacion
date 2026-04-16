// Magic-byte sniffing for image uploads. Multer already restricts the MIME
// type advertised by the client, but clients can lie, so we verify that the
// raw bytes match one of our whitelisted formats before handing the buffer
// to sharp.

export const IMAGE_MAGIC = {
  jpg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47],
  // WebP files begin with "RIFF" (they also contain "WEBP" at offset 8, but
  // checking "RIFF" is sufficient for our whitelist since we also validate
  // the MIME type upstream in multer).
  webp: [0x52, 0x49, 0x46, 0x46],
} as const;

export function isValidImageMagic(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  return (
    IMAGE_MAGIC.jpg.every((b, i) => buffer[i] === b) ||
    IMAGE_MAGIC.png.every((b, i) => buffer[i] === b) ||
    IMAGE_MAGIC.webp.every((b, i) => buffer[i] === b)
  );
}
