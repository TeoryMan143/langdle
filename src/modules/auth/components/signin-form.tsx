'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/core/components/ui/button';
import { cn } from '@/core/lib/utils';
import { Link, useRouter } from '@/i18n/navigation';
import { signInUser } from '../actions';
import { type SignInSchema, signInSchema } from '../schemas/signin';
import FormInput from './form-input';

function SignInForm() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isLoading },
  } = useForm<SignInSchema>({
    resolver: zodResolver(signInSchema),
  });

  const router = useRouter();
  const t = useTranslations('Errors.auth');
  const tm = useTranslations('AuthPage');

  const sParams = useSearchParams();
  const redtk = sParams.get('redtk');

  const onSubmit = async (data: SignInSchema) => {
    const toastId = toast.loading(`${t('signingIn')}...`);

    const res = await signInUser(data);

    if (res.error && typeof res.error === 'string') {
      toast.error(t(res.error), { id: toastId });
      return;
    }

    if (res.error && typeof res.error === 'object') {
      Object.entries(res.error.fieldErrors).forEach(([key, value]) => {
        setError(key as keyof SignInSchema, {
          message: value.join(', '),
        });
      });

      toast.error(t('dataValidation'), { id: toastId });
      return;
    }

    toast.success(t('signedIn'), { id: toastId });
    router.push(redtk ? `/addpermission?token=${redtk}` : '/account');
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
      </div>
      <div className='flex justify-center'>
        <Button disabled={isLoading} type='submit'>
          {isLoading ? tm('signingIn') : tm('signIn')}
        </Button>
      </div>
      <div>
        <p className='text-center'>
          {tm('noAccount')}{' '}
          <Link
            href='/signup'
            className='text-green-700 hover:underline hover:text-soft-det'
          >
            {tm('signUpHere')}
          </Link>
        </p>
      </div>
    </form>
  );
}

function InputError({ message }: { message?: string }) {
  return <p className='text-red-500 text-sm'>{message}</p>;
}

export default SignInForm;
