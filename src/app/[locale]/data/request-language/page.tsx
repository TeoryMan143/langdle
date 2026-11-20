import { RedirectType, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { dongle } from '@/core/lib/fonts';
import { withNext } from '@/core/lib/redirect';
import { auth } from '@/modules/auth/actions';
import LanguageRequestForm from '@/modules/lang-requests/components/language-request-form';

async function RequestLanguagePage() {
  const { session } = await auth();

  if (!session) {
    redirect(
      withNext('/signin', '/data/request-language'),
      RedirectType.replace,
    );
  }

  const t = await getTranslations('LanguageRequests');

  return (
    <main className='mt-5 space-y-6 px-4'>
      <div className='space-y-2 text-center'>
        <h2 className={`${dongle.className} text-6xl`}>{t('title')}</h2>
        <p className='mx-auto max-w-2xl text-foreground/80'>{t('intro')}</p>
      </div>
      <LanguageRequestForm />
    </main>
  );
}

export default RequestLanguagePage;
