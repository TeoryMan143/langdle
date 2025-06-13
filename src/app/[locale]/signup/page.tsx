import SignUpForm from '@/modules/auth/components/signup-form';
import { getTranslations } from 'next-intl/server';

async function SignUpPage() {
  const t = await getTranslations('AuthPage');

  return (
    <div>
      <h1 className='text-4xl text-center'>{t('signUp')}</h1>
      <div className='flex justify-center mt-5'>
        <div className='w-96'>
          <SignUpForm />
        </div>
      </div>
    </div>
  );
}

export default SignUpPage;
