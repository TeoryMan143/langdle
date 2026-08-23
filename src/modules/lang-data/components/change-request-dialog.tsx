'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/components/ui/select';
import type { LangFeatures } from '@/core/lib/types';
import { cn } from '@/core/lib/utils';
import { uploadChangeRequest } from '@/modules/lang-data/actions';
import {
  ChangeRequestFormValues,
  createChangeRequestSchema,
} from '../../lang-guess/shemas';

function ChangeRequestDialog({
  lang,
  feature,
  status,
}: {
  lang: string;
  feature: LangFeatures;
  status: 'present' | 'partial' | 'absent';
}) {
  const t = useTranslations('Features.name');
  const formT = useTranslations('Features.changeRequest');
  const changeRequestSchema = createChangeRequestSchema(formT);
  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ChangeRequestFormValues>({
    resolver: zodResolver(changeRequestSchema),
    defaultValues: {
      lang,
      feature,
      status,
      description: '',
    },
  });

  const { status: formStatus } = watch();

  const [diagOpen, setDiagOpen] = useState(false);

  const onSubmit = async (data: ChangeRequestFormValues) => {
    const toastId = toast.loading('Uploading request...');

    if (formStatus === status) {
      return toast.error('Choose a different status', { id: toastId });
    }

    const res = await uploadChangeRequest(data);

    if (!res.success) {
      return toast.error('server error', { id: toastId });
    }

    toast.success('Change request uploaded', { id: toastId });
    setDiagOpen(false);
  };

  return (
    <Dialog open={diagOpen} onOpenChange={open => setDiagOpen(open)}>
      <DialogTrigger asChild>
        <button
          data-feature={feature}
          data-state={status}
          className={cn(
            'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer',
            status === 'present' &&
              'border-emerald-600 bg-emerald-100 text-emerald-950',
            status === 'partial' &&
              'border-amber-500 bg-amber-100 text-amber-950',
            status === 'absent' &&
              'border-border bg-secondary-background text-foreground/65 opacity-80',
          )}
        >
          {t(feature)}
        </button>
      </DialogTrigger>
      <DialogContent>
        <form className='space-y-5' onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{formT('title')}</DialogTitle>
            <DialogDescription>{formT('description')}</DialogDescription>
          </DialogHeader>

          <input type='hidden' {...register('lang')} />
          <input type='hidden' {...register('feature')} />

          <div className='space-y-4'>
            <div className='grid gap-2'>
              <label className='text-sm font-medium' htmlFor='status'>
                {formT('requestedStatus')}
              </label>
              <Controller
                control={control}
                name='status'
                render={({ field }) => (
                  <Select
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <SelectTrigger id='status'>
                      <SelectValue placeholder={formT('statusPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='present'>
                        {formT('statusPresent')}
                      </SelectItem>
                      <SelectItem value='partial'>
                        {formT('statusPartial')}
                      </SelectItem>
                      <SelectItem value='absent'>
                        {formT('statusNotPresent')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.status && (
                <p className='text-sm text-red-500'>{errors.status.message}</p>
              )}
            </div>

            <div className='grid gap-2'>
              <label className='text-sm font-medium' htmlFor='description'>
                {formT('descriptionLabel')}
              </label>
              <textarea
                id='description'
                rows={4}
                placeholder={formT('descriptionPlaceholder')}
                className='flex min-h-24 w-full rounded-base border-2 border-border bg-secondary-background px-3 py-2 text-sm font-base text-foreground placeholder:text-foreground/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2'
                {...register('description')}
              />
              {errors.description && (
                <p className='text-sm text-red-500'>
                  {errors.description.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type='button' variant='neutral'>
                {formT('cancel')}
              </Button>
            </DialogClose>
            <Button
              disabled={isSubmitting || formStatus === status}
              type='submit'
            >
              {isSubmitting ? formT('submitting') : formT('submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ChangeRequestDialog;
