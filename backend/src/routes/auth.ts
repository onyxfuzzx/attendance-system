import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { userRepository } from '../repositories/UserRepository';
import { AppError } from '../middleware/error';
import { validate } from '../middleware/validate';
import { loginSchema, registerSchema } from '../schemas/auth';

const router = Router();

router.post('/register', validate(registerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, full_name, phone, role } = req.body;
    
    const existingUser = await userRepository.findByEmail(email);

    if (existingUser) {
      throw new AppError('Email already exists', 400);
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    const userRole = role || 'employee';
    const id = uuidv4();
    
    await userRepository.create({
      id,
      email,
      password: hashedPassword,
      full_name,
      phone,
      role: userRole as any
    });
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    next(error);
  }
});

router.post('/login', validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    
    const user = await userRepository.findByEmail(email);
    
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }
    
    if (!user.is_active) {
      throw new AppError('Account is deactivated', 401);
    }
    
    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) {
      throw new AppError('Invalid credentials', 401);
    }
    
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };
    
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'refresh', { expiresIn: '7d' });
    
    res.cookie('accessToken', accessToken, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'lax', 
      maxAge: 60 * 60 * 1000 
    });
    res.cookie('refreshToken', refreshToken, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'lax', 
      maxAge: 7 * 24 * 60 * 60 * 1000 
    });
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        profile_pic_url: user.profile_pic_url
      },
      accessToken
    });
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.token;
    if (!refreshToken) {
      throw new AppError('Refresh token required', 401);
    }
    
    try {
      const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh') as any;
      const accessToken = jwt.sign({
        userId: payload.userId,
        email: payload.email,
        role: payload.role
      }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
      
      res.cookie('accessToken', accessToken, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'lax', 
        maxAge: 60 * 60 * 1000 
      });
      res.json({ accessToken });
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
});

export default router;