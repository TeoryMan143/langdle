'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/core/components/ui/button';
import { COUNTRIES } from '@/core/lib/countries';
import { SelectMenuOption } from '@/core/lib/types';
import { cn } from '@/core/lib/utils';
import { Link, useRouter } from '@/i18n/navigation';
import { signUpUser } from '../actions';
import { type SignUpSchema, signUpSchema } from '../schemas/signup';
import CountrySelector from './country-selector';
import FormInput from './form-input';
import FormPasswordInput from './form-password-input';

function SignUpForm() {
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isLoading },
  } = useForm<SignUpSchema>({
    resolver: zodResolver(signUpSchema),
  });

  const router = useRouter();

  const t = useTranslations('AuthPage');

  const sParams = useSearchParams();
  const redtk = sParams.get('redtk');

  useEffect(() => {
    if (redtk) {
      toast.info(t('needAccountForPerm'));
    }
  }, [redtk, t]);

  const [isOpen, setIsOpen] = useState(false);
  const [country, setCountry] = useState('AF');

  useEffect(() => {
    setValue('country', country);
  }, [setValue, country]);

  const onSubmit = async (data: SignUpSchema) => {
    const toastId = toast.loading(`${t('signingUp')}...`);

    try {
      const res = await signUpUser(data);

      if (res.error && typeof res.error === 'string') {
        toast.error(t(`errors.${res.error}`), { id: toastId });
        return;
      }

      if (res.error && typeof res.error === 'object') {
        Object.entries(res.error.fieldErrors).forEach(([key, value]) => {
          setError(key as keyof SignUpSchema, {
            message: value.join(', '),
          });
        });

        toast.error('Validation errors', { id: toastId });
        return;
      }

      toast.success(t('accountCreated'), { id: toastId });
      router.push(`/signin${redtk ? `?redtk=${redtk}` : ''}`);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-4 mx-10 lg:mx-0'>
      <div className='flex flex-col gap-2'>
        <FormInput
          className={cn({
            'ring-2 ring-red-500 focus-visible:ring-red-500': errors.nickname,
          })}
          placeholder={t('nickname')}
          {...register('nickname')}
        />
        {errors.nickname && <InputError message={errors.nickname.message} />}
        <FormPasswordInput
          className={cn({
            'ring-2 ring-red-500 focus-visible:ring-red-500': errors.password,
          })}
          placeholder={t('password')}
          {...register('password')}
        />
        {errors.password && <InputError message={errors.password.message} />}
        <FormPasswordInput
          className={cn({
            'ring-2 ring-red-500 focus-visible:ring-red-500':
              errors.confirmPassword,
          })}
          placeholder={t('confirmPassword')}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <InputError message={errors.confirmPassword.message} />
        )}
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
      <div className='flex justify-center'>
        <Button disabled={isLoading} type='submit'>
          {isLoading ? t('creatingAccount') : t('createAccount')}{' '}
        </Button>
      </div>
      <div>
        <p className='text-center'>
          {t('alreadyHaveAccount')}{' '}
          <Link
            href={`/signin${redtk ? `?redtk=${redtk}` : ''}`}
            className='text-green-700 hover:underline hover:text-soft-det'
          >
            {t('signInHere')}
          </Link>
        </p>
      </div>
    </form>
  );
}

function InputError({ message }: { message?: string }) {
  return <p className='text-red-500 text-sm'>{message}</p>;
}

export default SignUpForm;
