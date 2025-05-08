'use client';

import { Button } from '@/core/components/ui/button';
import { type SignInSchema, signInSchema } from '../schemas/signin';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import FormInput from './form-input';
import Link from 'next/link';
import { cn } from '@/core/lib/utils';
import { toast } from 'sonner';
import { signInUser } from '../actions';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { SignInError, signInErrors } from '../types';

function SignInForm() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isValid, isLoading },
  } = useForm<SignInSchema>({
    resolver: zodResolver(signInSchema),
  });

  const router = useRouter();

  const t = useTranslations('Errors');

  const onSubmit = async (data: SignInSchema) => {
    const toastId = toast.loading('Signing in...');

    const res = await signInUser(data);

    if (res.error && typeof res.error === 'string') {
      toast.error(
        signInErrors.has(res.error as SignInError) ? t(res.error) : res.error,
        { id: toastId },
      );
      return;
    }

    if (res.error && typeof res.error === 'object') {
      Object.entries(res.error.fieldErrors).forEach(([key, value]) => {
        setError(key as keyof SignInSchema, {
          message: value.join(', '),
        });
      });

      toast.error('Validation errors', { id: toastId });
      return;
    }

    toast.success('Signed in successfuly ', { id: toastId });
    router.push('/account');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
      <div className='flex flex-col gap-2'>
        <FormInput
          className={cn({
            'ring-2 ring-red-500 focus-visible:ring-red-500': errors.nickname,
          })}
          placeholder='nickname'
          {...register('nickname')}
        />
        {errors.nickname && <InputError message={errors.nickname.message} />}
        <FormInput
          type='password'
          className={cn({
            'ring-2 ring-red-500 focus-visible:ring-red-500': errors.password,
          })}
          placeholder='password'
          {...register('password')}
        />
        {errors.password && <InputError message={errors.password.message} />}
      </div>
      <div className='flex justify-center'>
        <Button disabled={!isValid || isLoading} type='submit'>
          {isLoading ? 'Creating...' : 'Create Account'}{' '}
        </Button>
      </div>
      <div>
        <p className='text-center'>
          Don't have an account?{' '}
          <Link
            href='/signin'
            className='text-green-700 hover:underline hover:text-soft-det'
          >
            Sign up here
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
