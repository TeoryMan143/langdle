import SignOutButton from '@/modules/auth/components/signout-button';
import { auth } from '@/modules/auth/actions';
import { redirect, RedirectType } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

async function AccountPage() {
  const { user, session } = await auth();

  if (!session) {
    redirect('/', RedirectType.replace);
  }

  const t = await getTranslations('AccountPage');

  return (
    <div>
      <h1 className='text-4xl text-center'>{t('title')}</h1>
      <p className='text-center'>{user.nickname}</p>
      <SignOutButton />
    </div>
  );
}

export default AccountPage;
