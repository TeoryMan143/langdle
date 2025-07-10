'use client';

import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/core/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { signOutUser } from '../actions';
import { useAuth } from '../context';
import { SignOutError, signOutErrors } from '../types';

function SignOutButton() {
  const { session } = useAuth();
  const t = useTranslations('AccountPage');

  const router = useRouter();

  const handleSignOut = async () => {
    const toastId = toast.loading(t('signingOut'));
    if (!session) {
      toast.error(t('noSession'), { id: toastId });
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

    toast.success(t('successSignOut'), { id: toastId });
    router.push('/');
  };

  return (
    <div className='flex justify-center'>
      <Button onClick={handleSignOut}>{t('signOut')}</Button>
    </div>
  );
}

export default SignOutButton;
