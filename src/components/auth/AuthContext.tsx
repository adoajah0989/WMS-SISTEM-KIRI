import { createContext, useContext } from 'react';
import type { Session } from '@supabase/supabase-js';

export type AppRole = 'master' | 'manajer' | 'purchasing' | 'warehouse' | 'viewer';

export interface AuthProfile {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  isActive: boolean;
  warehouseIds: string[];
}

interface AuthContextValue {
  session: Session;
  profile: AuthProfile;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthGate');
  return value;
};
