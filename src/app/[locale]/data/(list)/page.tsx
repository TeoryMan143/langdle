import { RedirectType, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { buttonVariants } from '@/core/components/ui/button';
import { dongle } from '@/core/lib/fonts';
import { withNext } from '@/core/lib/redirect';
import { Link } from '@/i18n/navigation';
import { auth } from '@/modules/auth/actions';
import LangsList from '@/modules/lang-data/components/langs-list';
import LangsListSkeleton from '@/modules/lang-data/components/langs-list-skeleton';
import { getLangPermissions } from '@/modules/lang-permissions/actions';

async function DataPage() {
  const { session, user } = await auth();

  if (!session) {
    redirect(withNext('/signin', '/data'), RedirectType.replace);
  }

  const permissionsRes = await getLangPermissions(user.id);

  if (!permissionsRes.success && !user.admin) {
    console.error(permissionsRes.error);
    redirect('/', RedirectType.replace);
  }

  const permissions = permissionsRes.result;

  if (permissions?.length === 0) {
    redirect('/', RedirectType.replace);
  }

  const t = await getTranslations('ListPage');

  return (
    <main className='mt-5'>
      <h2 className={`${dongle.className} text-6xl mb-5 text-center`}>
        {t('langList')}
      </h2>

      <div className='flex justify-center gap-3 flex-wrap mb-6'>
        <Link
          className={buttonVariants({ variant: 'neutral' })}
          href='/data/public'
        >
          {t('publicOverview')}
        </Link>
        <Link
          className={buttonVariants({ variant: 'neutral' })}
          href='/data/request-language'
        >
          {t('requestLanguage')}
        </Link>
        {user.admin && (
          <Link
            className={buttonVariants({ variant: 'neutral' })}
            href='/data/requests'
          >
            {t('changeRequests')}
          </Link>
        )}
        {user.admin && (
          <Link
            className={buttonVariants({ variant: 'neutral' })}
            href='/data/review'
          >
            {t('reviewQueue')}
          </Link>
        )}
      </div>

      <div className='flex justify-center'>
        <Suspense fallback={<LangsListSkeleton search={user.admin} />}>
          <LangsList allowedLangs={user.admin ? undefined : permissions} />
        </Suspense>
      </div>
    </main>
  );
}

export default DataPage;
