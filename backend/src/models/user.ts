export interface User {
  id: string;
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role: 'admin' | 'employee';
  profile_pic_url?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: 'admin' | 'employee';
  profile_pic_url?: string;
}

export interface CreateUserDTO {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role?: 'admin' | 'employee';
}

export interface UpdateUserDTO {
  full_name?: string;
  phone?: string;
  is_active?: boolean;
}