'use client';

import { AuthProvider } from '@/modules/auth/context';
import { SessionValidationResult } from '@/modules/auth/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

type Props = {
  children: React.ReactNode;
  sessionData: SessionValidationResult;
};

function Providers({ children, sessionData }: Props) {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider sessionData={sessionData}>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

export default Providers;
