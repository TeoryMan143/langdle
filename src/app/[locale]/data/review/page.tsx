import { RedirectType, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { dongle } from '@/core/lib/fonts';
import { withNext } from '@/core/lib/redirect';
import { auth } from '@/modules/auth/actions';
import { getAllLanguages } from '@/modules/lang-data/actions';
import ReviewQueue from '@/modules/lang-data/components/review-queue';

async function ReviewPage() {
  const { session, user } = await auth();

  if (!session) {
    redirect(withNext('/signin', '/data/review'), RedirectType.replace);
  }

  if (!user.admin) {
    redirect('/', RedirectType.replace);
  }

  const t = await getTranslations('ReviewPage');
  const languagesRes = await getAllLanguages();

  if (!languagesRes.success) {
    console.error(languagesRes.error);
  }

  return (
    <main className='mx-auto mt-5 max-w-4xl space-y-6 px-4 pb-10'>
      <h2 className={`${dongle.className} text-6xl text-center`}>
        {t('title')}
      </h2>
      <p className='text-center text-foreground/80'>{t('intro')}</p>
      <ReviewQueue
        languages={languagesRes.success ? languagesRes.result : []}
      />
    </main>
  );
}

export default ReviewPage;
