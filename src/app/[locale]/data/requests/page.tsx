import { RedirectType, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { dongle } from '@/core/lib/fonts';
import { withNext } from '@/core/lib/redirect';
import { auth } from '@/modules/auth/actions';
import ReviewChangeRequests from '@/modules/lang-requests/components/review-change-requests';
import ReviewLanguageRequests from '@/modules/lang-requests/components/review-language-requests';
import ReviewRequestsSkeleton from '@/modules/lang-requests/components/review-requests-skeleton';

async function ChangeRequestsPage() {
  const { session, user } = await auth();

  if (!session) {
    redirect(withNext('/signin', '/data/requests'), RedirectType.replace);
  }

  if (!user.admin) {
    redirect('/', RedirectType.replace);
  }

  const t = await getTranslations('ChangeRequests');
  const languageT = await getTranslations('LanguageRequests');

  return (
    <main className='mt-5 space-y-6'>
      <h2 className={`${dongle.className} text-6xl text-center`}>
        {t('adminTitle')}
      </h2>
      <div className='flex justify-center'>
        <Suspense fallback={<ReviewRequestsSkeleton />}>
          <ReviewChangeRequests />
        </Suspense>
      </div>
      <h2 className={`${dongle.className} text-6xl text-center`}>
        {languageT('adminTitle')}
      </h2>
      <div className='flex justify-center'>
        <Suspense fallback={<ReviewRequestsSkeleton kind='language' />}>
          <ReviewLanguageRequests />
        </Suspense>
      </div>
    </main>
  );
}

export default ChangeRequestsPage;
