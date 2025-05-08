'use client';

import { Button } from '@/core/components/ui/button';
import { useAuth } from '../context';
import { toast } from 'sonner';
import { signOutUser } from '../actions';
import { signOutErrors, SignOutError } from '../types';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

function SignOutButton() {
  const { session } = useAuth();
  const t = useTranslations('Errors');
  const router = useRouter();

  const handleSignOut = async () => {
    const toastId = toast.loading('Signing out...');
    if (!session) {
      toast.error('No session found', { id: toastId });
      return;
    }

    const res = await signOutUser();

    if (res.error && typeof res.error === 'string') {
      toast.error(
        signOutErrors.has(res.error as SignOutError) ? t(res.error) : res.error,
        { id: toastId },
      );
      return;
    }

    toast.success('Signed out successfully', { id: toastId });
    router.push('/');
  };

  return (
    <div className='flex justify-center'>
      <Button onClick={handleSignOut}>Sign out</Button>
    </div>
  );
}

export default SignOutButton;
