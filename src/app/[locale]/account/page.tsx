import { RedirectType, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/modules/auth/actions';
import AccountData from '@/modules/auth/components/account-data';
import GameHistory from '@/modules/auth/components/game-history';
import SignOutButton from '@/modules/auth/components/signout-button';

async function AccountPage() {
  const { user, session } = await auth();

  if (!session) {
    redirect('/', RedirectType.replace);
  }

  const t = await getTranslations('AccountPage');

  return (
    <div className='min-h-full space-y-7'>
      <h1 className='text-4xl text-center'>{t('title')}</h1>
      <div className='flex flex-col justify-center items-center gap-3'>
        <div className='flex gap-5 flex-col md:flex-row'>
          <AccountData user={user} />
          <GameHistory />
        </div>
        <div className='flex justify-center'>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}

export default AccountPage;
