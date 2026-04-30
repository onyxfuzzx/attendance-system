import { Router, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { locationRepository } from '../repositories/LocationRepository';
import { AuthRequest, authenticate, authorizeAdmin } from '../middleware/auth';
import { createAuditLog } from '../services/audit';
import { AppError } from '../middleware/error';
import { validateBody } from '../middleware/validate';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const results = await locationRepository.findAllActive();
    res.json(results);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, authorizeAdmin, validateBody(['name', 'latitude', 'longitude']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, latitude, longitude, radius_meters } = req.body;
    const userId = req.user!.userId;
    
    const radius = radius_meters || 100;
    const id = uuidv4();
    
    await locationRepository.create({
      id,
      name,
      latitude,
      longitude,
      radius_meters: radius
    });
    
    await createAuditLog({
      actorId: userId,
      action: 'CREATE_LOCATION',
      targetType: 'Location',
      targetId: id,
      details: { name, latitude, longitude, radius_meters: radius }
    });
    
    res.status(201).json({
      id,
      name,
      latitude,
      longitude,
      radius_meters: radius
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const location = await locationRepository.findById(id);
    
    if (!location) {
      throw new AppError('Location not found', 404);
    }
    
    res.json(location);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, authorizeAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, latitude, longitude, radius_meters, is_active } = req.body;
    const userId = req.user!.userId;
    
    await locationRepository.update(id, { name, latitude, longitude, radius_meters, is_active });
    
    await createAuditLog({
      actorId: userId,
      action: 'UPDATE_LOCATION',
      targetType: 'Location',
      targetId: id
    });
    
    const location = await locationRepository.findById(id);
    res.json(location);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, authorizeAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    
    const hasActiveShifts = await locationRepository.hasActiveShifts(id);
    if (hasActiveShifts) {
      throw new AppError('Cannot delete location with active shifts. Please reassign shifts first.', 400);
    }
    
    await locationRepository.deactivate(id);
    
    await createAuditLog({
      actorId: userId,
      action: 'DELETE_LOCATION',
      targetType: 'Location',
      targetId: id
    });
    
    res.json({ message: 'Location deactivated successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;