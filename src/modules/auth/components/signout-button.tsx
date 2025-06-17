'use client';

import { Button } from '@/core/components/ui/button';
import { useAuth } from '../context';
import { toast } from 'sonner';
import { signOutUser } from '../actions';
import { signOutErrors, SignOutError } from '../types';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';

function SignOutButton() {
  const { session } = useAuth();
  const t = useTranslations('Errors');
  const tm = useTranslations('AccountPage');

  const router = useRouter();

  const handleSignOut = async () => {
    const toastId = toast.loading(tm('signingOut'));
    if (!session) {
      toast.error(tm('noSession'), { id: toastId });
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

    toast.success(tm('successSignOut'), { id: toastId });
    router.push('/');
  };

  return (
    <div className='flex justify-center'>
      <Button onClick={handleSignOut}>{tm('signOut')}</Button>
    </div>
  );
}

export default SignOutButton;
