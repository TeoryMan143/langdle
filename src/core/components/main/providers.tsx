'use client';

import { AuthProvider } from '@/modules/auth/context';
import { SessionValidationResult } from '@/modules/auth/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';

function Providers({
  children,
  sessionData,
}: { children: React.ReactNode; sessionData: SessionValidationResult }) {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider sessionData={sessionData}>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default Providers;
