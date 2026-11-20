'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Label } from '@/core/components/ui/label';
import { Textarea } from '@/core/components/ui/textarea';
import { FLAG_MAX_BYTES, FLAG_TYPES } from '@/core/lib/flags-config';
import { useRouter } from '@/i18n/navigation';
import FeatureStatusPicker, {
  fromFeatureStates,
  toFeatureStates,
} from '@/modules/lang-data/components/feature-status-picker';
import type { FeatureStates } from '@/modules/lang-data/types';
import { uploadLanguageRequest } from '../actions';
import { createLanguageRequestSchema } from '../schemas/language-request';
import type {
  LanguageRequestFormValues,
  LanguageRequestValues,
} from '../types';

function FieldError({ message }: { message?: string }) {
  return message ? <p className='text-sm text-danger'>{message}</p> : null;
}

function LanguageRequestForm() {
  const t = useTranslations('LanguageRequests');
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LanguageRequestFormValues, unknown, LanguageRequestValues>({
    resolver: zodResolver(createLanguageRequestSchema(t)),
    defaultValues: {
      code: '',
      name: '',
      exonym: '',
      description: '',
      features: [],
      partial: [],
    },
  });

  const [states, setStates] = useState<FeatureStates>(() =>
    toFeatureStates({ features: [], partial: [] }),
  );

  const [flag, setFlag] = useState<File | null>(null);
  const [flagError, setFlagError] = useState<string>();
  const [preview, setPreview] = useState<string>();

  useEffect(() => {
    if (!flag) {
      setPreview(undefined);
      return;
    }

    const url = URL.createObjectURL(flag);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [flag]);

  const onFlagChange = (file: File | undefined) => {
    setFlagError(undefined);

    if (!file) {
      setFlag(null);
      return;
    }

    if (!(FLAG_TYPES as readonly string[]).includes(file.type)) {
      setFlag(null);
      setFlagError(t('errors.flagType'));
      return;
    }

    if (file.size > FLAG_MAX_BYTES) {
      setFlag(null);
      setFlagError(t('errors.flagSize'));
      return;
    }

    setFlag(file);
  };

  const onSubmit = async (values: LanguageRequestValues) => {
    if (!flag) {
      setFlagError(t('errors.flagRequired'));
      return;
    }

    const toastId = toast.loading(t('sending'));

    const formData = new FormData();
    formData.set(
      'data',
      JSON.stringify({ ...values, ...fromFeatureStates(states) }),
    );
    formData.set('flag', flag);

    const res = await uploadLanguageRequest(formData);

    if (!res.success) {
      return toast.error(
        t.has(`errors.${res.error}`)
          ? t(`errors.${res.error}`)
          : t('errors.unknown'),
        { id: toastId },
      );
    }

    toast.success(t('sent'), { id: toastId });
    router.push('/account');
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit, () => {
        if (!flag) setFlagError(t('errors.flagRequired'));
      })}
      className='space-y-8 w-full'
    >
      <section className='mx-auto max-w-2xl bg-background border-2 border-border rounded-base shadow-shadow p-5 grid gap-4 sm:grid-cols-2'>
        <div className='grid content-start gap-2'>
          <Label htmlFor='code'>{t('code')}</Label>
          <Input
            id='code'
            placeholder='eu'
            autoComplete='off'
            aria-invalid={!!errors.code}
            {...register('code')}
          />
          <p className='text-xs text-foreground/70'>{t('codeHint')}</p>
          <FieldError message={errors.code?.message} />
        </div>

        <div className='grid content-start gap-2'>
          <Label htmlFor='name'>{t('name')}</Label>
          <Input
            id='name'
            placeholder='Euskara'
            aria-invalid={!!errors.name}
            {...register('name')}
          />
          <p className='text-xs text-foreground/70'>{t('nameHint')}</p>
          <FieldError message={errors.name?.message} />
        </div>

        <div className='grid content-start gap-2'>
          <Label htmlFor='exonym'>{t('exonym')}</Label>
          <Input
            id='exonym'
            placeholder='Basque'
            aria-invalid={!!errors.exonym}
            {...register('exonym')}
          />
          <FieldError message={errors.exonym?.message} />
        </div>

        <div className='grid content-start gap-2'>
          <Label htmlFor='flag'>{t('flag')}</Label>
          <div className='flex items-center gap-3'>
            <Input
              id='flag'
              type='file'
              className='cursor-pointer py-0 leading-9 file:mr-3 file:cursor-pointer file:border-r-2 file:border-border file:pr-3'
              accept={FLAG_TYPES.join(',')}
              aria-invalid={!!flagError}
              onChange={e => onFlagChange(e.target.files?.[0])}
            />
            {preview && (
              <img
                src={preview}
                alt={t('flagPreview')}
                className='w-12 h-8 object-cover rounded-xs border-2 border-border shrink-0'
              />
            )}
          </div>
          <p className='text-xs text-foreground/70'>{t('flagHint')}</p>
          <FieldError message={flagError} />
        </div>

        <div className='grid content-start gap-2 sm:col-span-2'>
          <Label htmlFor='description'>{t('description')}</Label>
          <Textarea
            id='description'
            rows={4}
            placeholder={t('descriptionPlaceholder')}
            aria-invalid={!!errors.description}
            {...register('description')}
          />
          <FieldError message={errors.description?.message} />
        </div>
      </section>

      <section className='space-y-4'>
        <h3 className='text-2xl font-heading text-center'>{t('features')}</h3>
        <p className='text-center text-foreground/80'>{t('featuresHint')}</p>
        <FeatureStatusPicker
          value={states}
          onChange={(feature, state) =>
            setStates(current => ({ ...current, [feature]: state }))
          }
        />
      </section>

      <div className='flex justify-center'>
        <Button disabled={isSubmitting} type='submit'>
          {isSubmitting ? t('sending') : t('submit')}
        </Button>
      </div>
    </form>
  );
}

export default LanguageRequestForm;
