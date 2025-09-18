'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/core/components/ui/button';
import { COUNTRIES } from '@/core/lib/countries';
import { SelectMenuOption } from '@/core/lib/types';
import { cn } from '@/core/lib/utils';
import { useRouter } from '@/i18n/navigation';
import { createGoogleAccount } from '../actions';
import { type GoogleDataSchema, googleDataSchema } from '../schemas/googledata';
import CountrySelector from './country-selector';
import FormInput from './form-input';

function GoogleDataForm({
  accountData,
}: {
  accountData: { nickname: string; googleId: string; email: string };
}) {
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { isLoading, errors },
  } = useForm<GoogleDataSchema>({
    resolver: zodResolver(googleDataSchema),
  });

  const t = useTranslations('AuthPage');

  const router = useRouter();

  const onSubmit: SubmitHandler<GoogleDataSchema> = async formData => {
    const toastId = toast.loading(t('signingUp'));

    const res = await createGoogleAccount({
      nickname:
        formData.nickname.length > 0 ? formData.nickname : accountData.nickname,
      googleId: accountData.googleId,
      country: formData.country,
      email: accountData.email,
    });

    if (res.error && typeof res.error === 'string') {
      toast.error(t(`errors.${res.error}`), { id: toastId });
      return;
    }

    if (!res.success && typeof res.error === 'object') {
      if (res.error && typeof res.error === 'object') {
        Object.entries(res.error.fieldErrors).forEach(([key, value]) => {
          setError(key as keyof GoogleDataSchema, {
            message: value.join(', '),
          });
        });

        toast.error(t('errors.dataValidation'), { id: toastId });
        return;
      }
    }

    toast.success(t('signedIn'), { id: toastId });
    router.push('/account');
  };

  const [isOpen, setIsOpen] = useState(false);
  const [country, setCountry] = useState('AF');

  useEffect(() => {
    setValue('country', country);
  }, [setValue, country]);

  return (
    <form
      className='flex flex-col items-center '
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className='flex flex-col gap-3 md:w-[300px]'>
        <FormInput
          className={cn({
            'ring-2 ring-red-500 focus-visible:ring-red-500': errors.nickname,
          })}
          placeholder={accountData.nickname}
          {...register('nickname')}
        />
        {errors.nickname && <InputError message={errors.nickname.message} />}
        <CountrySelector
          id={'countries'}
          open={isOpen}
          onToggle={() => setIsOpen(!isOpen)}
          onChange={val => setCountry(val)}
          selectedValue={
            COUNTRIES.find(
              option => option.value === country,
            ) as SelectMenuOption
          }
        />
      </div>
      <Button className='mt-5' disabled={isLoading}>
        {t('createAccount')}
      </Button>
    </form>
  );
}

function InputError({ message }: { message?: string }) {
  return <p className='text-red-500 text-sm'>{message}</p>;
}

export default GoogleDataForm;
