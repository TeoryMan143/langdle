import { dongle } from '@/core/lib/fonts';
import { auth } from '@/modules/auth/actions';
import { getLangPermissions } from '@/modules/lang-data/actions';
import LangsList from '@/modules/lang-data/components/langs-list';
import { redirect, RedirectType } from 'next/navigation';

async function DataPage() {
  const { session, user } = await auth();

  if (!session) {
    redirect('/', RedirectType.replace);
  }

  const permissionsRes = await getLangPermissions(user.id);

  if (!permissionsRes.success) {
    console.error(permissionsRes.error);
    redirect('/', RedirectType.replace);
  }

  const permissions = permissionsRes.result;

  if (permissions.length === 0 && !user.admin) {
    redirect('/', RedirectType.replace);
  }

  return (
    <main className='mt-5'>
      <h2 className={`${dongle.className} text-6xl mb-5 text-center`}>
        Languages list
      </h2>

      <div className='flex justify-center'>
        <LangsList />
      </div>
    </main>
  );
}

export default DataPage;
