import { useContext } from 'react';
import { AuthContext, Context } from '@/contexts/AuthContext';

export function useAuth() {
  const context = useContext<AuthContext | null>(Context);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  const { user, error, signIn, signOut } = context;
  return { user, error, signIn, signOut };
}
