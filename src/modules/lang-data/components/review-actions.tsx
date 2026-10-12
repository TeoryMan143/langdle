'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { Textarea } from '@/core/components/ui/textarea';
import { acceptChangeRequest, rejectChangeRequest } from '../actions';
import { createRejectChangeRequestSchema } from '../schemas/change-request';
import type { RejectChangeRequestValues } from '../types';

type Props = {
  requestId: string;
  /** Author of the request, named in the rejection dialog. */
  nickname: string;
};

function ReviewActions({ requestId, nickname }: Props) {
  const t = useTranslations('ChangeRequests');
  const cancelT = useTranslations('Features.changeRequest');
  const [accepting, setAccepting] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RejectChangeRequestValues>({
    resolver: zodResolver(createRejectChangeRequestSchema(t)),
    defaultValues: { reason: '' },
  });

  const onAccept = async () => {
    setAccepting(true);
    const toastId = toast.loading(t('accepting'));

    const res = await acceptChangeRequest(requestId);
    setAccepting(false);

    if (!res.success) {
      return toast.error(t(`errors.${res.error}`), { id: toastId });
    }

    if (!res.result.emailSent) {
      return toast.warning(t('acceptedNoEmail'), { id: toastId });
    }

    toast.success(t('accepted'), { id: toastId });
  };

  const onReject = async ({ reason }: RejectChangeRequestValues) => {
    const toastId = toast.loading(t('rejecting'));

    const res = await rejectChangeRequest(requestId, reason);

    if (!res.success) {
      return toast.error(t(`errors.${res.error}`), { id: toastId });
    }

    setRejectOpen(false);

    if (!res.result.emailSent) {
      return toast.warning(t('rejectedNoEmail'), { id: toastId });
    }

    toast.success(t('rejected'), { id: toastId });
  };

  return (
    <div className='flex gap-2'>
      <Button disabled={accepting} onClick={onAccept} size='sm'>
        {t('accept')}
      </Button>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogTrigger
          render={<Button disabled={accepting} size='sm' variant='neutral' />}
        >
          {t('reject')}
        </DialogTrigger>
        <DialogContent>
          <form className='space-y-5' onSubmit={handleSubmit(onReject)}>
            <DialogHeader>
              <DialogTitle>{t('rejectTitle')}</DialogTitle>
              <DialogDescription>
                {t('rejectDescription', { nickname })}
              </DialogDescription>
            </DialogHeader>

            <div className='grid gap-2'>
              <label className='text-sm font-heading' htmlFor='reason'>
                {t('reasonLabel')}
              </label>
              <Textarea
                id='reason'
                rows={4}
                placeholder={t('reasonPlaceholder')}
                aria-invalid={!!errors.reason}
                {...register('reason')}
              />
              {errors.reason && (
                <p className='text-sm text-red-500'>{errors.reason.message}</p>
              )}
            </div>

            <DialogFooter>
              <DialogClose render={<Button type='button' variant='neutral' />}>
                {cancelT('cancel')}
              </DialogClose>
              <Button disabled={isSubmitting} type='submit'>
                {t('reject')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ReviewActions;
