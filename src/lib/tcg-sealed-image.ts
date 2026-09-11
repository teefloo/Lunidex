/** Detects the actual image type instead of trusting Cardmarket's MIME header. */
export function sealedImageContentType(bytes: Uint8Array): 'image/png' | 'image/jpeg' | null {
  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (pngSignature.every((value, index) => bytes[index] === value)) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  return null;
}
