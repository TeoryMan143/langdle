import { getTranslations } from 'next-intl/server';
import { buttonVariants } from '@/core/components/ui/button';
import { Link } from '@/i18n/navigation';
import { getMyLanguageRequests } from '../actions';
import LanguageRequestCard from './language-request-card';

async function MyLanguageRequests() {
  const t = await getTranslations('LanguageRequests');
  const res = await getMyLanguageRequests();

  return (
    <section className='p-5 bg-background border-2 rounded-base space-y-3 w-full max-w-3xl'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <h4 className='text-2xl font-bold'>{t('myTitle')}</h4>
        <Link
          className={buttonVariants({ size: 'sm' })}
          href='/data/request-language'
        >
          {t('requestLanguage')}
        </Link>
      </div>
      {!res.success && <p>{t('errors.unknown')}</p>}
      {res.success && res.result.length === 0 && <p>{t('myEmpty')}</p>}
      {res.success && (
        <div className='space-y-4'>
          {res.result.map(request => (
            <LanguageRequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </section>
  );
}

export default MyLanguageRequests;
