const { Pool } = require('pg');
const crypto = require('crypto');
const argon2 = require('argon2');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Phone validation
function validateAndNormalizePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, error: 'Phone number is required.' };
  }
  
  const cleaned = phone.replace(/[\s()\-.\[\]]/g, '');
  
  if (!/^\+?[1-9]\d{1,14}$/.test(cleaned)) {
    return { isValid: false, error: 'Invalid phone format.' };
  }
  
  const phoneE164 = cleaned.startsWith('+') ? cleaned : '+' + cleaned;
  
  if (phoneE164.length < 7 || phoneE164.length > 15) {
    return { isValid: false, error: 'Invalid phone number length.' };
  }
  
  return { isValid: true, e164: phoneE164 };
}

module.exports = async (req, res) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { phone, password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required.' });
    }
    
    // Validate phone
    const phoneValidation = validateAndNormalizePhone(phone);
    if (!phoneValidation.isValid) {
      return res.status(400).json({ error: phoneValidation.error });
    }
    
    const phoneE164 = phoneValidation.e164;
    
    // Get user
    const result = await pool.query(
      'SELECT id, password_hash, locked_until FROM users WHERE phone_e164 = $1',
      [phoneE164]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid phone or password.' });
    }
    
    const user = result.rows[0];
    
    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({ 
        error: 'Account temporarily locked. Too many failed attempts.' 
      });
    }
    
    // Verify password
    let passwordMatch = false;
    try {
      const hashStr = user.password_hash.toString();
      passwordMatch = await argon2.verify(hashStr, password);
    } catch (error) {
      console.error('Password verification error:', error);
      return res.status(401).json({ error: 'Invalid phone or password.' });
    }
    
    if (!passwordMatch) {
      // Increment failed attempts
      await pool.query(
        'UPDATE users SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1, last_failed_login = NOW() WHERE id = $1',
        [user.id]
      );
      
      // Check if we should lock the account
      const updatedUser = await pool.query(
        'SELECT failed_login_attempts FROM users WHERE id = $1',
        [user.id]
      );
      
      if (updatedUser.rows[0].failed_login_attempts >= 5) {
        const lockedUntil = new Date();
        lockedUntil.setMinutes(lockedUntil.getMinutes() + 15);
        await pool.query(
          'UPDATE users SET locked_until = $1 WHERE id = $2',
          [lockedUntil, user.id]
        );
      }
      
      return res.status(401).json({ error: 'Invalid phone or password.' });
    }
    
    // Reset failed attempts on successful login
    await pool.query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = $1',
      [user.id]
    );
    
    // Create session
    const sessionId = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14); // 14 days
    
    await pool.query(
      'INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES ($1, $2, $3, NOW())',
      [sessionId, user.id, expiresAt]
    );
    
    // Set cookie
    res.setHeader('Set-Cookie', `session=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${14 * 24 * 60 * 60}`);
    
    return res.status(200).json({
      message: 'Login successful.',
      userId: user.id,
      redirectTo: '/dashboard'
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};