'use client';

import { Button } from '@/core/components/ui/button';
import { type SignUpSchema, signUpSchema } from '../schemas/signup';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import FormInput from './form-input';
import Link from 'next/link';
import { cn } from '@/core/lib/utils';
import { toast } from 'sonner';
import { signUpUser } from '../actions';
import { useRouter } from 'next/navigation';

function SignUpForm() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isValid, isLoading },
  } = useForm<SignUpSchema>({
    resolver: zodResolver(signUpSchema),
  });

  const router = useRouter();

  const onSubmit = async (data: SignUpSchema) => {
    const toastId = toast.loading('Creating your account...');

    try {
      const res = await signUpUser(data);

      if (res.error && typeof res.error === 'string') {
        toast.error(res.error, { id: toastId });
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

      toast.success('Account created successfully', { id: toastId });
      router.push('/signin');
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
        <FormInput
          type='password'
          className={cn({
            'ring-2 ring-red-500 focus-visible:ring-red-500':
              errors.confirmPassword,
          })}
          placeholder='confirm password'
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <InputError message={errors.confirmPassword.message} />
        )}
      </div>
      <div className='flex justify-center'>
        <Button disabled={!isValid || isLoading} type='submit'>
          {isLoading ? 'Creating...' : 'Create Account'}{' '}
        </Button>
      </div>
      <div>
        <p className='text-center'>
          Already signed up?{' '}
          <Link
            href='/signin'
            className='text-green-700 hover:underline hover:text-soft-det'
          >
            Sign in here
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
