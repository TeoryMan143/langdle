import { RedirectType, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/core/components/ui/button';
import { dongle } from '@/core/lib/fonts';
import { Link } from '@/i18n/navigation';
import { auth } from '@/modules/auth/actions';
import { getLangPermissions } from '@/modules/lang-data/actions';
import LangsList from '@/modules/lang-data/components/langs-list';

async function DataPage() {
  const { session, user } = await auth();

  if (!session) {
    redirect('/', RedirectType.replace);
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

      <div className='flex justify-center mb-6'>
        <Button asChild variant='neutral'>
          <Link href='/data/public'>{t('publicOverview')}</Link>
        </Button>
      </div>

      <div className='flex justify-center'>
        <LangsList allowedLangs={user.admin ? undefined : permissions} />
      </div>
    </main>
  );
}

export default DataPage;
