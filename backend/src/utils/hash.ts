import crypto from 'crypto';
import { Readable } from 'stream';

/**
 * Calculates SHA-256 checksum hex string from a Buffer.
 * @param buffer - File contents buffer
 * @returns SHA-256 checksum string (64 characters)
 */
export const calculateBufferSHA256 = (buffer: Buffer): string => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Calculates SHA-256 checksum hex string from a Readable Stream.
 * @param stream - Readable file stream
 * @returns Promise resolving to SHA-256 checksum string
 */
export const calculateStreamSHA256 = (stream: Readable): Promise<string> => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
};
