import { Router, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { correctionRepository } from '../repositories/CorrectionRepository';
import { AuthRequest, authenticate, authorize, authorizeAdmin } from '../middleware/auth';
import { createAuditLog } from '../services/audit';
import { AppError } from '../middleware/error';
import { validateBody } from '../middleware/validate';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { status } = req.query;
    
    const filters: any = { status };
    if (req.user!.role === 'employee') {
      filters.userId = userId;
    }
    
    const results = await correctionRepository.findByFilters(filters);
    res.json(results);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, validateBody(['request_type', 'reason']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { attendance_id, request_type, reason } = req.body;
    const id = uuidv4();
    
    await correctionRepository.create({
      id,
      user_id: userId,
      attendance_id,
      request_type,
      reason
    });
    
    await createAuditLog({
      actorId: userId,
      action: 'SUBMIT_CORRECTION_REQUEST',
      targetType: 'CorrectionRequest',
      targetId: id,
      details: { request_type, attendance_id }
    });
    
    res.status(201).json({
      id,
      user_id: userId,
      attendance_id,
      request_type,
      reason,
      status: 'pending'
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const correction = await correctionRepository.findById(id);
    
    if (!correction) {
      throw new AppError('Correction request not found', 404);
    }
    
    res.json(correction);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/review', authenticate, authorize(['admin']), validateBody(['status']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, reviewer_notes } = req.body;
    const reviewerId = req.user!.userId;
    
    if (!['approved', 'rejected'].includes(status)) {
      throw new AppError('Invalid status. Must be approved or rejected.', 400);
    }
    
    await correctionRepository.review(id, reviewerId, status, reviewer_notes);
    
    await createAuditLog({
      actorId: reviewerId,
      action: `CORRECTION_REQUEST_${status.toUpperCase()}`,
      targetType: 'CorrectionRequest',
      targetId: id,
      details: { reviewer_notes }
    });
    
    const result = await correctionRepository.findById(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;