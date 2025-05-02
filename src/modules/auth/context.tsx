'use client';
import { Session, User } from './types';
import { createContext, useContext } from 'react';

interface AuthProviderProps {
  user: User | null;
  session: Session | null;
}

const AuthContext = createContext<AuthProviderProps>({} as AuthProviderProps);

export const AuthProvider = ({
  children,
  sessionData,
}: {
  children: React.ReactNode;
  sessionData: AuthProviderProps;
}) => {
  return (
    <AuthContext.Provider value={sessionData}>{children}</AuthContext.Provider>
  );
};

export const useSession = () => {
  const authContext = useContext(AuthContext);

  if (!authContext) {
    throw new Error('useSession must be used within a AuthProvider');
  }

  return authContext;
};
