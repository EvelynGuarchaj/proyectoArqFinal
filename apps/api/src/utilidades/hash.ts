import { createHash } from 'node:crypto';

// Hash SHA-256 en hexadecimal (tokens de refresco y llaves API)
export function hashSha256(texto: string): string {
  return createHash('sha256').update(texto).digest('hex');
}
