'use client';
import { Session, UserDTO } from './types';
import { createContext, useContext } from 'react';

interface AuthProviderProps {
  user: UserDTO | null;
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

export const useAuth = () => {
  const authContext = useContext(AuthContext);

  if (authContext.session === undefined) {
    throw new Error('useAuth must be used within a AuthProvider');
  }

  return authContext;
};
