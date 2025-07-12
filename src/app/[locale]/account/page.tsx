import { RedirectType, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/modules/auth/actions';
import AccountData from '@/modules/auth/components/account-data';
import SignOutButton from '@/modules/auth/components/signout-button';

async function AccountPage() {
  const { user, session } = await auth();

  if (!session) {
    redirect('/', RedirectType.replace);
  }

  const t = await getTranslations('AccountPage');

  return (
    <div>
      <h1 className='text-4xl text-center'>{t('title')}</h1>
      <AccountData user={user} />
      <SignOutButton />
    </div>
  );
}

export default AccountPage;
