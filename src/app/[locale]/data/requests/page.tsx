import { RedirectType, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { dongle } from '@/core/lib/fonts';
import { auth } from '@/modules/auth/actions';
import ReviewChangeRequests from '@/modules/lang-data/components/review-change-requests';

async function ChangeRequestsPage() {
  const { session, user } = await auth();

  if (!session || !user.admin) {
    redirect('/', RedirectType.replace);
  }

  const t = await getTranslations('ChangeRequests');

  return (
    <main className='mt-5 space-y-6'>
      <h2 className={`${dongle.className} text-6xl text-center`}>
        {t('adminTitle')}
      </h2>
      <div className='flex justify-center'>
        <ReviewChangeRequests />
      </div>
    </main>
  );
}

export default ChangeRequestsPage;
