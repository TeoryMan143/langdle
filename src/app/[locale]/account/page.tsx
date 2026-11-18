import { RedirectType, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { dongle } from '@/core/lib/fonts';
import { withNext } from '@/core/lib/redirect';
import { NO_INDEX } from '@/core/lib/seo';
import { auth } from '@/modules/auth/actions';
import DeleteAccountButton from '@/modules/auth/components/delete-account-button';
import SignOutButton from '@/modules/auth/components/signout-button';
import MyChangeRequests from '@/modules/lang-data/components/my-change-requests';
import MyLanguageRequests from '@/modules/lang-data/components/my-language-requests';
import MyRequestsSkeleton from '@/modules/lang-data/components/my-requests-skeleton';
import GameHistory from '@/modules/lang-guess/components/game-history';
import GameHistorySkeleton from '@/modules/lang-guess/components/game-history-skeleton';
import AccountData from '@/modules/user-profile/components/account-data';

export const metadata = NO_INDEX;

/** The history fills the right column from lg, and scrolls inside itself. */
const HISTORY_CLASS_NAME = 'max-h-[70dvh] lg:absolute lg:inset-0 lg:max-h-none';

async function AccountPage() {
  const { user, session } = await auth();

  if (!session) {
    redirect(withNext('/signin', '/account'), RedirectType.replace);
  }

  const t = await getTranslations('AccountPage');

  return (
    <main className='mx-auto w-full max-w-6xl space-y-6 px-4 pt-2 pb-8'>
      <h1 className={`${dongle.className} text-6xl text-center`}>
        {t('title')}
      </h1>
      {/*
       * Two columns from lg: the profile and the requests on the left, the
       * history over the whole right side (rows 1 and 2), scrolling inside
       * itself so it is as tall as the left column. One column below that, in
       * the app's order: profile, history, requests.
       */}
      <div className='grid gap-6 lg:grid-cols-2'>
        <div className='lg:col-start-1 lg:row-start-1'>
          <AccountData
            user={user}
            actions={
              <>
                <SignOutButton />
                <DeleteAccountButton />
              </>
            }
          />
        </div>
        <div className='relative lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:min-h-144'>
          <Suspense
            fallback={<GameHistorySkeleton className={HISTORY_CLASS_NAME} />}
          >
            <GameHistory className={HISTORY_CLASS_NAME} />
          </Suspense>
        </div>
        <div className='space-y-6 lg:col-start-1 lg:row-start-2'>
          <Suspense fallback={<MyRequestsSkeleton />}>
            <MyChangeRequests />
          </Suspense>
          <Suspense fallback={<MyRequestsSkeleton kind='language' />}>
            <MyLanguageRequests />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

export default AccountPage;
