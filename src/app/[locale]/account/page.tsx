import { RedirectType, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/modules/auth/actions';
import AccountData from '@/modules/auth/components/account-data';

async function AccountPage() {
  const { user, session } = await auth();

  if (!session) {
    redirect('/', RedirectType.replace);
  }

  const t = await getTranslations('AccountPage');

  return (
    <div className='min-h-full space-y-7'>
      <h1 className='text-4xl text-center'>{t('title')}</h1>
      <div className='flex justify-center'>
        <div className='flex'>
          <AccountData user={user} />
          <div className='flex-1'>
            <p>GameStory</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccountPage;
