import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { queryOne } from '../db/pool';
import { validateAndNormalizePhone, getCountryCodeFromE164 } from '../utils/phone';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../utils/password';
import { createSession, setSessionCookie, clearSessionCookie, revokeSession, User } from '../utils/session';
import { config } from '../config';
import { logger } from '../utils/logger';
import { checkPhoneRateLimit } from '../middleware/rate-limit';

const router = Router();

/**
 * POST /auth/signup
 * Create a new user account with phone and password
 */
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;

    // Validate phone
    const phoneValidation = validateAndNormalizePhone(phone);
    if (!phoneValidation.isValid) {
      return res.status(400).json({
        error: phoneValidation.error,
      });
    }

    // Validate password
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: passwordValidation.error,
      });
    }

    const phoneE164 = phoneValidation.e164!;

    // Check if phone already exists
    const existingUser = await queryOne<User>(
      'SELECT id FROM users WHERE phone_e164 = $1',
      [phoneE164]
    );

    if (existingUser) {
      logger.metric('auth.signup.conflict', { 
        countryCode: getCountryCodeFromE164(phoneE164) || undefined
      });
      return res.status(409).json({
        error: 'That phone number already has an account.',
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user - convert string hash to Buffer for BYTEA column
    const userId = randomUUID();
    const now = new Date();
    
    const newUser = await queryOne<User>(
      `INSERT INTO users (id, phone_e164, password_hash, created_at, password_updated_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [userId, phoneE164, Buffer.from(passwordHash), now, now]
    );

    if (!newUser) {
      throw new Error('Failed to create user');
    }

    // Create session
    const session = await createSession(userId);

    // Set session cookie
    setSessionCookie(res, session.id);

    // Log telemetry
    const countryCode = getCountryCodeFromE164(phoneE164) || undefined;
    logger.metric('auth.signup.success', { userId, countryCode });

    // Return success with redirect
    return res.status(201).json({
      userId,
      redirectTo: '/dashboard'
    });
  } catch (error) {
    logger.error('Signup error', error as Error);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * POST /auth/login
 * Authenticate user with phone and password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;

    // Validate phone
    const phoneValidation = validateAndNormalizePhone(phone);
    if (!phoneValidation.isValid) {
      return res.status(400).json({
        error: phoneValidation.error,
      });
    }

    const phoneE164 = phoneValidation.e164!;

    // Check phone-based rate limit
    if (!checkPhoneRateLimit(phoneE164)) {
      return res.status(429).json({
        error: 'Too many login attempts. Please try again later.',
      });
    }

    // Find user by phone
    const user = await queryOne<User>(
      'SELECT * FROM users WHERE phone_e164 = $1',
      [phoneE164]
    );

    if (!user) {
      // Don't reveal whether the phone exists
      return res.status(401).json({
        error: 'Phone or password is incorrect.',
      });
    }

    // Check if account is locked
    if (user.locked_until && user.locked_until > new Date()) {
      logger.metric('auth.login.locked', { 
        userId: user.id,
        countryCode: getCountryCodeFromE164(phoneE164) || undefined
      });
      return res.status(423).json({
        error: 'Too many attempts. Try again in 15 minutes.',
      });
    }

    // Verify password
    const isValidPassword = await verifyPassword(user.password_hash, password);

    if (!isValidPassword) {
      // Increment failed login count
      const newFailedCount = user.failed_login_count + 1;
      let lockedUntil = null;

      // Check if we should lock the account
      if (newFailedCount >= config.rateLimit.lockoutThreshold) {
        lockedUntil = new Date(Date.now() + config.rateLimit.lockoutDurationMinutes * 60 * 1000);
      }

      await queryOne(
        `UPDATE users
         SET failed_login_count = $1, locked_until = $2
         WHERE id = $3`,
        [newFailedCount, lockedUntil, user.id]
      );

      logger.metric('auth.login.failure', { 
        userId: user.id,
        countryCode: getCountryCodeFromE164(phoneE164) || undefined
      });

      if (lockedUntil) {
        return res.status(423).json({
          error: 'Too many attempts. Try again in 15 minutes.',
        });
      }

      return res.status(401).json({
        error: 'Phone or password is incorrect.',
      });
    }

    // Success - reset failed login count
    await queryOne(
      `UPDATE users
       SET failed_login_count = 0, locked_until = NULL
       WHERE id = $1`,
      [user.id]
    );

    // Create session
    const session = await createSession(user.id);

    // Set session cookie
    setSessionCookie(res, session.id);

    // Log telemetry
    const countryCode = getCountryCodeFromE164(phoneE164) || undefined;
    logger.metric('auth.login.success', { userId: user.id, countryCode });

    return res.status(200).json({
      message: 'Login successful',
      redirectTo: '/dashboard'
    });
  } catch (error) {
    logger.error('Login error', error as Error);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * POST /auth/logout
 * Revoke the current session
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const sessionId = req.cookies?.[config.session.cookieName];

    if (sessionId) {
      // Revoke the session in database
      await revokeSession(sessionId);
    }

    // Clear the cookie
    clearSessionCookie(res);

    return res.status(204).send();
  } catch (error) {
    logger.error('Logout error', error as Error);
    // Still clear cookie even if DB operation fails
    clearSessionCookie(res);
    return res.status(204).send();
  }
});

export default router;
