import { Router, Response } from 'express';
import path from 'path';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth-check';

const router = Router();

// Dashboard page - protected route
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.sendFile(path.join(__dirname, '../../public/dashboard.html'));
});

// User info API - protected route
router.get('/user', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  res.json({
    userId: req.user.id,
    phone: req.user.phone
  });
});

export default router;