import { getLanguage } from '@/core/actions/langs';
import { Button } from '@/core/components/ui/button';
import { Link } from '@/i18n/navigation';
import { auth } from '@/modules/auth/actions';
import { setLangPermission } from '@/modules/lang-data/actions';
import { getTranslations } from 'next-intl/server';
import { redirect, RedirectType } from 'next/navigation';

type Props = {
  searchParams: Promise<{ token?: string }>;
};

async function AddPermissionPage({ searchParams }: Props) {
  const { session } = await auth();

  if (!session) {
    redirect('/', RedirectType.replace);
  }

  const { token } = await searchParams;

  const t = await getTranslations('Errors.langPermissions');

  if (!token) {
    return (
      <Base success={false}>
        <h3 className='text-2xl'>{t('tokenNotFound')}</h3>
      </Base>
    );
  }

  const res = await setLangPermission(token);

  if (!res.success) {
    return (
      <Base success={false}>
        <h3 className='text-2xl'>{t(res.error)}</h3>
      </Base>
    );
  }

  const langRes = await getLanguage(res.result);

  if (!langRes.success) {
    return (
      <Base success={false}>
        <h3 className='text-2xl'>{t('languageNotFound')}</h3>
      </Base>
    );
  }

  const lang = langRes.result;

  return (
    <Base success>
      <h3 className='text-3xl text-center mb-2'> Permission set </h3>
      <p>Now you have permission to edit the language: {lang.name}</p>
    </Base>
  );
}

async function Base({
  children,
  success,
}: { children: React.ReactNode; success: boolean }) {
  return (
    <div className='flex flex-col items-center justify-center gap-4 mt-5'>
      <div>{children}</div>
      <div>
        <Button asChild>
          <Link href={success ? '/data' : '/'}>
            {success ? 'Go to languages list' : 'Go Home'}
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default AddPermissionPage;
