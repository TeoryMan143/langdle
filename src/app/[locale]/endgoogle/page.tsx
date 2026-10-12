import { RedirectType } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import GoogleDataForm from '@/modules/auth/components/google-data-form';
import { decodeGoogleSignupToken } from '@/modules/auth/service';

type Props = {
  searchParams: Promise<{ data?: string }>;
};

async function EndGooglePage({ searchParams }: Props) {
  const { data } = await searchParams;

  const locale = await getLocale();

  if (!data) {
    return redirect({ href: '/', locale }, RedirectType.replace);
  }

  const accountData = await decodeGoogleSignupToken(data);

  if (!accountData) {
    return redirect({ href: '/', locale }, RedirectType.replace);
  }

  return (
    <div className='flex flex-col items-center gap-5'>
      <h2 className='text-3xl text-center'>We are almost done</h2>
      <GoogleDataForm accountData={accountData} dataToken={data} />
    </div>
  );
}

export default EndGooglePage;
