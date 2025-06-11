import { getLanguage } from '@/core/actions/langs';
import { auth } from '@/modules/auth/actions';
import { getLangPermissions } from '@/modules/lang-data/actions';
import LangFeaturesForm from '@/modules/lang-data/components/lang-features';
import LangImage from '@/modules/lang-data/components/lang-image';
import SharePermissionButton from '@/modules/lang-data/components/share-permission-button';
import { notFound, redirect, RedirectType } from 'next/navigation';

type Props = {
  params: Promise<{ code: string }>;
};

async function EditDataPage({ params }: Props) {
  const { code } = await params;

  const { user, session } = await auth();

  if (!session) {
    redirect('/', RedirectType.replace);
  }

  const langPermissionsRes = await getLangPermissions(user.id);

  if (!langPermissionsRes.success && !user.admin) {
    console.error('Could not get permissions: ', langPermissionsRes.error);
    redirect('/', RedirectType.replace);
  }

  const langPermissions = langPermissionsRes.result;

  if (!langPermissions?.includes(code) && !user.admin) {
    redirect('/', RedirectType.replace);
  }

  const { success, result: lang, error } = await getLanguage(code);

  if (!success) {
    console.error(error);
    notFound();
  }

  const { name, exonym } = lang;

  return (
    <main className='space-y-4'>
      <h2 className='text-center text-2xl relative'>
        <LangImage code={code} /> {`${name}${exonym ? ` (${exonym})` : ''}`}
        {user.admin && <SharePermissionButton lang={lang.id} />}
      </h2>
      <div className='flex justify-center'>
        <LangFeaturesForm code={code} currentData={lang} />
      </div>
    </main>
  );
}

export default EditDataPage;
