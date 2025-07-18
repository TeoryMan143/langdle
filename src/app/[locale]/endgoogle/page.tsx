import * as jose from 'jose';
import { RedirectType } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import GoogleDataForm from '@/modules/auth/components/google-data-form';

type Props = {
  searchParams: Promise<{ data?: string }>;
};

const validateAccountData = async (dataToken: string) => {
  try {
    const secret = jose.base64url.decode(process.env.JWT_SECRET as string);
    const {
      payload: { nickname, googleId },
    } = await jose.jwtDecrypt<{ nickname: string; googleId: string }>(
      dataToken,
      secret,
    );
    return { nickname, googleId };
  } catch (_) {
    return null;
  }
};

async function EndGooglePage({ searchParams }: Props) {
  const { data } = await searchParams;

  const locale = await getLocale();

  if (!data) {
    return redirect({ href: '/', locale }, RedirectType.replace);
  }

  const accountData = await validateAccountData(data);

  if (!accountData) {
    return redirect({ href: '/', locale }, RedirectType.replace);
  }

  return (
    <div className='flex flex-col items-center gap-5'>
      <h2 className='text-3xl text-center'>We are almost done</h2>
      <GoogleDataForm accountData={accountData} />
    </div>
  );
}

export default EndGooglePage;
