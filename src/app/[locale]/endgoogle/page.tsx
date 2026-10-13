import { RedirectType } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { getOAuthSignupData } from '@/modules/auth/actions';
import GoogleDataForm from '@/modules/auth/components/google-data-form';

type Props = {
  searchParams: Promise<{ data?: string }>;
};

async function EndGooglePage({ searchParams }: Props) {
  const { data } = await searchParams;

  const locale = await getLocale();

  if (!data) {
    return redirect({ href: '/', locale }, RedirectType.replace);
  }

  const res = await getOAuthSignupData(data);

  if (!res.success) {
    return redirect({ href: '/', locale }, RedirectType.replace);
  }

  const t = await getTranslations('AuthPage');

  return (
    <div className='flex flex-col items-center gap-5'>
      <h2 className='text-3xl text-center'>{t('almostDone')}</h2>
      <GoogleDataForm accountData={res.result} dataToken={data} />
    </div>
  );
}

export default EndGooglePage;
