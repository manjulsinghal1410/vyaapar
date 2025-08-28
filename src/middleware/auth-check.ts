import { Request, Response, NextFunction } from 'express';
import { db } from '../utils/db';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    phone: string;
  };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.sid;
  
  if (!sessionId) {
    // For API endpoints, return 401
    if (req.path.startsWith('/user')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    // For page endpoints, redirect to login
    return res.redirect('/');
  }
  
  try {
    // Verify session exists and is not expired
    const result = await db.query(
      `SELECT s.id, s.user_id, s.expires_at, u.phone_e164 as phone
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = $1 
       AND s.expires_at > NOW()
       AND s.revoked_at IS NULL`,
      [sessionId]
    );
    
    if (result.rows.length === 0) {
      // Session invalid or expired
      res.clearCookie('sid');
      
      if (req.path.startsWith('/user')) {
        return res.status(401).json({ error: 'Session expired' });
      }
      return res.redirect('/');
    }
    
    // Attach user info to request
    req.user = {
      id: result.rows[0].user_id,
      phone: result.rows[0].phone
    };
    
    next();
  } catch (error) {
    console.error('Auth check error:', error);
    
    if (req.path.startsWith('/user')) {
      return res.status(500).json({ error: 'Authentication error' });
    }
    return res.redirect('/');
  }
}