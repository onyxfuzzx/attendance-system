import { Router, Response, NextFunction } from 'express';
import { userRepository } from '../repositories/UserRepository';
import { shiftRepository } from '../repositories/ShiftRepository';
import { AuthRequest, authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { createAuditLog } from '../services/audit';
import { AppError } from '../middleware/error';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const user = await userRepository.findById(userId);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    res.json({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      role: user.role,
      profile_pic_url: user.profile_pic_url,
      is_active: user.is_active,
      created_at: user.created_at
    });
  } catch (error) {
    next(error);
  }
});

router.get('/my-shifts', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const shifts = await shiftRepository.findByUserId(userId);
    res.json(shifts);
  } catch (error) {
    next(error);
  }
});

router.put('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { full_name, phone } = req.body;
    
    await userRepository.update(userId, { full_name, phone });
    
    await createAuditLog({
      actorId: userId,
      action: 'UPDATE_PROFILE',
      targetType: 'User',
      targetId: userId
    });
    
    const user = await userRepository.findById(userId);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.post('/upload-photo', authenticate, upload, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }
    
    const profile_pic_url = `/uploads/profiles/${req.file.filename}`;
    
    const request = userRepository['pool'].request();
    await request
      .input('id', userId)
      .input('url', profile_pic_url)
      .query('UPDATE Users SET profile_pic_url = @url, updated_at = GETDATE() WHERE id = @id');
    
    await createAuditLog({
      actorId: userId,
      action: 'UPLOAD_PROFILE_PIC',
      targetType: 'User',
      targetId: userId
    });
    
    res.json({ profile_pic_url });
  } catch (error) {
    next(error);
  }
});

export default router;