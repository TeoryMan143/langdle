import { getTranslations } from 'next-intl/server';
import SigninForm from '@/modules/auth/components/signin-form';

async function SigninPage() {
  const t = await getTranslations('AuthPage');

  return (
    <div>
      <h1 className='text-4xl text-center'>{t('signIn')}</h1>
      <div className='flex justify-center mt-5'>
        <div className='w-96'>
          <SigninForm />
        </div>
      </div>
    </div>
  );
}

export default SigninPage;
