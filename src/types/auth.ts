
export type UserRole = 'admin' | 'warehouse_manager' | 'field_operator' | 'sales_operator' | 'customer';

export interface User {
  id: string;
  email?: string;
  name?: string;
  username?: string;
  role?: UserRole;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
  avatar_url?: string;
}

export interface AuthContextType {
  user: User | null;
  session: any;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<void>;
  signIn: (provider: 'google' | 'github' | 'email', email?: string, password?: string) => Promise<void>;
  signUp: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (data: any) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  verifyOTP: (email: string, token: string, type: 'email' | 'magiclink') => Promise<any>;
}

export interface ScanResponse {
  success: boolean;
  status: 'success' | 'error';
  data?: any;
  error?: string;
  product?: any;
  inventory?: any;
}

export interface ProcessableStockIn {
  id: string;
  product_id: string;
  quantity: number;
  status: string;
  created_at: string;
  product?: any;
  boxes?: number;
  source?: string;
  submitter?: {
    name: string;
    username: string;
    id: string;
  };
  notes?: string;
}

export interface Profile {
  id: string;
  name: string | null;
  username: string | null;
  role: string | null;
  active: boolean | null;
  created_at: string;
  updated_at: string;
}
