import argon2 from 'argon2';
import { config } from '../config';

/**
 * Hash a password using Argon2id with configured parameters
 */
export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: config.argon2.memoryMB * 1024, // Convert MB to KB
    timeCost: config.argon2.iterations,
    parallelism: config.argon2.parallelism,
  });
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(hash: string | Buffer, password: string): Promise<boolean> {
  try {
    // Handle both string and Buffer types for backward compatibility
    const hashString = typeof hash === 'string' ? hash : hash.toString();
    return await argon2.verify(hashString, password);
  } catch {
    return false;
  }
}

/**
 * Validate password meets minimum requirements
 */
export function validatePasswordStrength(password: string): { isValid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Use 8+ characters' };
  }

  return { isValid: true };
}
