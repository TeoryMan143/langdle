import { getTranslations } from 'next-intl/server';
import { NO_INDEX } from '@/core/lib/seo';
import SigninForm from '@/modules/auth/components/signin-form';

export const metadata = NO_INDEX;

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
