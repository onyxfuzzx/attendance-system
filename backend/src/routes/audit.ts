import { Router, Response, NextFunction } from 'express';
import { auditRepository } from '../repositories/AuditRepository';
import { AuthRequest, authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, authorizeAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const results = await auditRepository.findAll();
    res.json(results);
  } catch (error) {
    next(error);
  }
});

export default router;