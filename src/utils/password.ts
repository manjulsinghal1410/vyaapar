import * as argon2 from 'argon2';
import { config } from '../config';

export interface PasswordValidationResult {
  isValid: boolean;
  error?: string;
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      error: 'Password is required',
    };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      error: 'Use 8+ characters.',
    };
  }

  return {
    isValid: true,
  };
}

export async function hashPassword(password: string): Promise<Buffer> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: config.argon2.memoryMB * 1024, // Convert MB to KB
    timeCost: config.argon2.iterations,
    parallelism: config.argon2.parallelism,
    raw: true, // Return raw buffer
  });
}

export async function verifyPassword(
  hash: Buffer,
  password: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}