'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/core/components/ui/button';
import { cn } from '@/core/lib/utils';
import { Link, useRouter } from '@/i18n/navigation';
import { signUpUser } from '../actions';
import { type SignUpSchema, signUpSchema } from '../schemas/signup';
import FormInput from './form-input';

function SignUpForm() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isLoading },
  } = useForm<SignUpSchema>({
    resolver: zodResolver(signUpSchema),
  });

  const router = useRouter();

  const t = useTranslations('Errors.auth');
  const tm = useTranslations('AuthPage');

  const sParams = useSearchParams();
  const redtk = sParams.get('redtk');

  useEffect(() => {
    if (redtk) {
      toast.info(tm('needAccountForPerm'));
    }
  }, [redtk, tm]);

  const onSubmit = async (data: SignUpSchema) => {
    const toastId = toast.loading(`${t('signingUp')}...`);

    try {
      const res = await signUpUser(data);

      if (res.error && typeof res.error === 'string') {
        toast.error(t(res.error), { id: toastId });
        return;
      }

      if (res.error && typeof res.error === 'object') {
        Object.entries(res.error.fieldErrors).forEach(([key, value]) => {
          setError(key as keyof SignUpSchema, {
            message: value.join(', '),
          });
        });

        toast.error(t('Validation errors'), { id: toastId });
        return;
      }

      toast.success(t('accountCreated'), { id: toastId });
      router.push(`/signin${redtk ? `?redtk=${redtk}` : ''}`);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
      <div className='flex flex-col gap-2'>
        <FormInput
          className={cn({
            'ring-2 ring-red-500 focus-visible:ring-red-500': errors.nickname,
          })}
          placeholder={tm('nickname')}
          {...register('nickname')}
        />
        {errors.nickname && <InputError message={errors.nickname.message} />}
        <FormInput
          type='password'
          className={cn({
            'ring-2 ring-red-500 focus-visible:ring-red-500': errors.password,
          })}
          placeholder={tm('password')}
          {...register('password')}
        />
        {errors.password && <InputError message={errors.password.message} />}
        <FormInput
          type='password'
          className={cn({
            'ring-2 ring-red-500 focus-visible:ring-red-500':
              errors.confirmPassword,
          })}
          placeholder={tm('confirmPassword')}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <InputError message={errors.confirmPassword.message} />
        )}
      </div>
      <div className='flex justify-center'>
        <Button disabled={isLoading} type='submit'>
          {isLoading ? tm('creatingAccount') : tm('createAccount')}{' '}
        </Button>
      </div>
      <div>
        <p className='text-center'>
          {tm('alreadyHaveAccount')}{' '}
          <Link
            href={`/signin${redtk ? `?redtk=${redtk}` : ''}`}
            className='text-green-700 hover:underline hover:text-soft-det'
          >
            {tm('signInHere')}
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
