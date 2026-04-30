import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { userRepository } from '../repositories/UserRepository';
import { AuthRequest, authenticate, authorizeAdmin } from '../middleware/auth';
import { createAuditLog } from '../services/audit';
import { AppError } from '../middleware/error';
import { validateBody } from '../middleware/validate';

const router = Router();

router.get('/', authenticate, authorizeAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { limit, offset, search } = req.query;
    const { users, total } = await userRepository.findAll({
      limit: limit ? parseInt(limit as string) : 10,
      offset: offset ? parseInt(offset as string) : 0,
      search: search as string
    });
    
    res.json({
      users: users.map((u: any) => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        phone: u.phone,
        role: u.role,
        is_active: u.is_active,
        assigned_shifts: u.assigned_shifts,
        created_at: u.created_at
      })),
      total
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, authorizeAdmin, validateBody(['email', 'password', 'full_name']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password, full_name, phone, role } = req.body;
    const adminId = req.user!.userId;
    
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new AppError('Email already exists', 400);
    }
    
    const id = uuidv4();
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    await userRepository.create({
      id,
      email,
      password: hashedPassword,
      full_name,
      phone,
      role: role || 'employee'
    });
    
    await createAuditLog({
      actorId: adminId,
      action: 'CREATE_EMPLOYEE',
      targetType: 'User',
      targetId: id,
      details: { email, full_name, role }
    });
    
    res.status(201).json({ id, email, full_name, role: role || 'employee' });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, authorizeAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { full_name, phone, is_active } = req.body;
    const adminId = req.user!.userId;
    
    await userRepository.update(id, { full_name, phone, is_active });
    
    await createAuditLog({
      actorId: adminId,
      action: 'UPDATE_EMPLOYEE',
      targetType: 'User',
      targetId: id
    });
    
    const user = await userRepository.findById(id);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, authorizeAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { adminPassword } = req.body;
    const adminId = req.user!.userId;
    
    // Verify admin password
    const admin = await userRepository.findById(adminId);
    if (!admin || !bcrypt.compareSync(adminPassword, admin.password)) {
      throw new AppError('Invalid admin password', 401);
    }
    
    // Check if employee has active shifts
    const hasShifts = await userRepository.hasActiveShifts(id);
    if (hasShifts) {
      throw new AppError('Cannot delete employee with assigned shifts. Please remove their shifts first.', 400);
    }
    
    await userRepository.hardDelete(id);
    
    await createAuditLog({
      actorId: adminId,
      action: 'DELETE_EMPLOYEE',
      targetType: 'User',
      targetId: id
    });
    
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;