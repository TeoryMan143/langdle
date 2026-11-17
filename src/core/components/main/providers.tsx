'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthProvider } from '@/modules/auth/hooks/use-auth';
import { SessionValidationResult } from '@/modules/auth/types';

type Props = {
  children: React.ReactNode;
  sessionData: SessionValidationResult;
};

function Providers({ children, sessionData }: Props) {
  // One client for the whole session: a new one per render drops the cache.
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider sessionData={sessionData}>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

export default Providers;
