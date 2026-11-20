import { RedirectType, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { buttonVariants } from '@/core/components/ui/button';
import { withNext } from '@/core/lib/redirect';
import { NO_INDEX } from '@/core/lib/seo';
import { Link } from '@/i18n/navigation';
import { auth } from '@/modules/auth/actions';
import { getLanguage } from '@/modules/lang-data/actions';
import { setLangPermission } from '@/modules/lang-permissions/actions';

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export const metadata = NO_INDEX;

async function AddPermissionPage({ searchParams }: Props) {
  const { token } = await searchParams;

  const t = await getTranslations('AddPermissionPage');

  if (!token) {
    return (
      <Base success={false}>
        <h3 className='text-2xl'>{t('errors.tokenNotFound')}</h3>
      </Base>
    );
  }

  const { session } = await auth();

  if (!session) {
    return redirect(
      withNext('/signup', `/addpermission?token=${encodeURIComponent(token)}`),
      RedirectType.replace,
    );
  }

  const res = await setLangPermission(token);

  if (!res.success) {
    return (
      <Base success={false}>
        <h3 className='text-2xl'>{t(`errors.${res.error}`)}</h3>
      </Base>
    );
  }

  const langRes = await getLanguage(res.result);

  if (!langRes.success) {
    return (
      <Base success={false}>
        <h3 className='text-2xl'>{t('errors.languageNotFound')}</h3>
      </Base>
    );
  }

  const lang = langRes.result;

  return (
    <Base success>
      <h3 className='text-3xl text-center mb-2'>{t('permissionSet')}</h3>
      <p>{t('nowHavePermission', { lang: lang.name })}</p>
    </Base>
  );
}

async function Base({
  children,
  success,
}: {
  children: React.ReactNode;
  success: boolean;
}) {
  const t = await getTranslations('AddPermissionPage');

  return (
    <div className='flex flex-col items-center justify-center gap-4 mt-5'>
      <div>{children}</div>
      <div>
        <Link className={buttonVariants()} href={success ? '/data' : '/'}>
          {success ? t('goLangList') : t('goHome')}
        </Link>
      </div>
    </div>
  );
}

export default AddPermissionPage;
