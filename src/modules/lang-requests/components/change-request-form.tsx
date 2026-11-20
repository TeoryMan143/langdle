'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/core/components/ui/button';
import { DialogClose, DialogFooter } from '@/core/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/components/ui/select';
import { Textarea } from '@/core/components/ui/textarea';
import { uploadChangeRequest } from '../actions';
import { createChangeRequestSchema } from '../schemas/change-request';
import type { ChangeRequestFormValues, ChangeRequestPayload } from '../types';

/**
 * The body of the change request dialog. Loaded on the first open only (see
 * `ChangeRequestDialog`), so the atlas doesn't ship the form libraries up
 * front.
 */
function ChangeRequestForm({
  lang,
  feature,
  status,
  onDone,
}: ChangeRequestPayload & { onDone: () => void }) {
  const formT = useTranslations('Features.changeRequest');
  const errorT = useTranslations('ChangeRequests.errors');
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

  const statusItems = [
    { value: 'present', label: formT('statusPresent') },
    { value: 'partial', label: formT('statusPartial') },
    { value: 'absent', label: formT('statusNotPresent') },
  ] as const;

  const onSubmit = async (data: ChangeRequestFormValues) => {
    const toastId = toast.loading(formT('submitting'));

    if (formStatus === status) {
      return toast.error(formT('sameStatus'), { id: toastId });
    }

    const res = await uploadChangeRequest(data);

    if (!res.success) {
      return toast.error(
        errorT.has(res.error) ? errorT(res.error) : errorT('unknown'),
        { id: toastId },
      );
    }

    toast.success(formT('sent'), { id: toastId });
    onDone();
  };

  return (
    <form className='space-y-5' onSubmit={handleSubmit(onSubmit)}>
      <input type='hidden' {...register('lang')} />
      <input type='hidden' {...register('feature')} />

      <div className='space-y-4'>
        <div className='grid gap-2'>
          <label className='text-sm font-heading' htmlFor='status'>
            {formT('requestedStatus')}
          </label>
          <Controller
            control={control}
            name='status'
            render={({ field }) => (
              <Select
                items={statusItems}
                onValueChange={value => value && field.onChange(value)}
                value={field.value}
              >
                <SelectTrigger id='status'>
                  <SelectValue placeholder={formT('statusPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {statusItems.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.status && (
            <p className='text-sm text-danger'>{errors.status.message}</p>
          )}
        </div>

        <div className='grid gap-2'>
          <label className='text-sm font-heading' htmlFor='description'>
            {formT('descriptionLabel')}
          </label>
          <Textarea
            id='description'
            rows={4}
            placeholder={formT('descriptionPlaceholder')}
            className='min-h-24'
            {...register('description')}
          />
          {errors.description && (
            <p className='text-sm text-danger'>{errors.description.message}</p>
          )}
        </div>
      </div>

      <DialogFooter>
        <DialogClose render={<Button type='button' variant='neutral' />}>
          {formT('cancel')}
        </DialogClose>
        <Button disabled={isSubmitting || formStatus === status} type='submit'>
          {isSubmitting ? formT('submitting') : formT('submit')}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default ChangeRequestForm;
