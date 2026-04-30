import { Router, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { shiftRepository } from '../repositories/ShiftRepository';
import { AuthRequest, authenticate, authorizeAdmin } from '../middleware/auth';
import { createAuditLog } from '../services/audit';
import { AppError } from '../middleware/error';
import { validateBody } from '../middleware/validate';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const results = await shiftRepository.findAllActive();
    res.json(results);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, authorizeAdmin, validateBody(['location_id', 'name', 'start_time', 'end_time']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { location_id, name, start_time, end_time, days_mask } = req.body;
    const userId = req.user!.userId;
    
    const days = days_mask || 127;
    const id = uuidv4();
    
    await shiftRepository.create({
      id,
      location_id,
      name,
      start_time,
      end_time,
      days_mask: days
    });
    
    await createAuditLog({
      actorId: userId,
      action: 'CREATE_SHIFT',
      targetType: 'Shift',
      targetId: id,
      details: { location_id, name, start_time, end_time, days_mask: days }
    });
    
    res.status(201).json({ id, location_id, name, start_time, end_time, days_mask: days });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const shift = await shiftRepository.findById(id);
    
    if (!shift) {
      throw new AppError('Shift not found', 404);
    }
    
    res.json(shift);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, authorizeAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, start_time, end_time, days_mask, is_active } = req.body;
    const userId = req.user!.userId;
    
    await shiftRepository.update(id, { name, start_time, end_time, days_mask, is_active });
    
    await createAuditLog({
      actorId: userId,
      action: 'UPDATE_SHIFT',
      targetType: 'Shift',
      targetId: id
    });
    
    const shift = await shiftRepository.findById(id);
    res.json(shift);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, authorizeAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    
    await shiftRepository.deactivate(id);
    
    await createAuditLog({
      actorId: userId,
      action: 'DELETE_SHIFT',
      targetType: 'Shift',
      targetId: id
    });
    
    res.json({ message: 'Shift deactivated successfully' });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/employees', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const results = await shiftRepository.findEmployeesByShift(id);
    res.json(results);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/employees', authenticate, authorizeAdmin, validateBody(['user_ids']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id: shiftId } = req.params;
    const { user_ids, effective_from } = req.body;
    const userId = req.user!.userId;
    
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      throw new AppError('User IDs must be a non-empty array', 400);
    }
    
    const effectiveDate = effective_from || new Date().toISOString().split('T')[0];
    
    await shiftRepository.assignEmployees(shiftId, user_ids, effectiveDate);
    
    await createAuditLog({
      actorId: userId,
      action: 'ASSIGN_EMPLOYEES_TO_SHIFT',
      targetType: 'Shift',
      targetId: shiftId,
      details: { user_ids }
    });
    
    res.status(201).json({ message: 'Employees assigned to shift successfully' });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/employees/:userId', authenticate, authorizeAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id: shiftId, userId } = req.params;
    const adminId = req.user!.userId;
    
    await shiftRepository.removeEmployee(shiftId, userId);
    
    await createAuditLog({
      actorId: adminId,
      action: 'REMOVE_EMPLOYEE_FROM_SHIFT',
      targetType: 'Shift',
      targetId: shiftId,
      details: { removed_user_id: userId }
    });
    
    res.json({ message: 'Employee removed from shift successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;