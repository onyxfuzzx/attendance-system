import { Router, Response, NextFunction } from 'express';
import { analyticsRepository } from '../repositories/AnalyticsRepository';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/employee', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const stats = await analyticsRepository.getEmployeeStats(userId);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

router.get('/admin', authenticate, authorize(['admin']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const analytics = await analyticsRepository.getAdminAnalytics();
    res.json(analytics);
  } catch (error) {
    next(error);
  }
});

export default router;