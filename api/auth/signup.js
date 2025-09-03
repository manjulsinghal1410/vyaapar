import { Pool } from 'pg';
import crypto from 'crypto';
import argon2 from 'argon2';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Phone validation
function validateAndNormalizePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, error: 'Phone number is required.' };
  }
  
  const cleaned = phone.replace(/[\s()\-.[\]]/g, '');
  
  if (!/^\+?[1-9]\d{1,14}$/.test(cleaned)) {
    return { isValid: false, error: 'Invalid phone format.' };
  }
  
  const phoneE164 = cleaned.startsWith('+') ? cleaned : '+' + cleaned;
  
  if (phoneE164.length < 7 || phoneE164.length > 15) {
    return { isValid: false, error: 'Invalid phone number length.' };
  }
  
  return { isValid: true, e164: phoneE164 };
}

// Password validation
function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required.' };
  }
  
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters.' };
  }
  
  if (password.length > 100) {
    return { isValid: false, error: 'Password is too long.' };
  }
  
  return { isValid: true };
}

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { phone, password } = req.body;
    
    // Validate phone
    const phoneValidation = validateAndNormalizePhone(phone);
    if (!phoneValidation.isValid) {
      return res.status(400).json({ error: phoneValidation.error });
    }
    
    // Validate password
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.error });
    }
    
    const phoneE164 = phoneValidation.e164;
    
    // Check if phone already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE phone_e164 = $1',
      [phoneE164]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'That phone number already has an account.'
      });
    }
    
    // Hash password
    const hashedPassword = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 64 * 1024,
      timeCost: 2,
      parallelism: 1
    });
    
    // Create user
    const userId = crypto.randomUUID();
    await pool.query(
      'INSERT INTO users (id, phone_e164, password_hash, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
      [userId, phoneE164, Buffer.from(hashedPassword)]
    );
    
    // Create session
    const sessionId = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14); // 14 days
    
    await pool.query(
      'INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES ($1, $2, $3, NOW())',
      [sessionId, userId, expiresAt]
    );
    
    // Set cookie
    res.setHeader('Set-Cookie', `session=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${14 * 24 * 60 * 60}`);
    
    return res.status(201).json({
      message: 'Account created successfully.',
      userId,
      redirectTo: '/dashboard'
    });
    
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};