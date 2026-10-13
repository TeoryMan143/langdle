'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/core/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/core/components/ui/dialog';
import { useRouter } from '@/i18n/navigation';
import { deleteAccount } from '../actions';

function DeleteAccountButton() {
  const t = useTranslations('AccountPage');
  const [pending, setPending] = useState(false);

  const router = useRouter();

  const handleDelete = async () => {
    setPending(true);
    const toastId = toast.loading(t('deletingAccount'));

    const res = await deleteAccount();

    setPending(false);

    if (!res.success) {
      toast.error(t('errorDeleteAccount'), { id: toastId });
      return;
    }

    toast.success(t('successDeleteAccount'), { id: toastId });
    router.push('/');
  };

  return (
    <Dialog>
      <DialogTrigger render={<Button variant='neutral' />}>
        {t('deleteAccount')}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('deleteAccountTitle')}</DialogTitle>
          <DialogDescription>{t('deleteAccountDescription')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type='button' variant='neutral' />}>
            {t('cancel')}
          </DialogClose>
          <Button type='button' disabled={pending} onClick={handleDelete}>
            {t('deleteAccountConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DeleteAccountButton;
