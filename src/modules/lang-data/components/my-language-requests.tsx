import { getTranslations } from 'next-intl/server';
import { buttonVariants } from '@/core/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/core/components/ui/card';
import { Link } from '@/i18n/navigation';
import { getMyLanguageRequests } from '../actions';
import LanguageRequestCard from './language-request-card';

async function MyLanguageRequests() {
  const t = await getTranslations('LanguageRequests');
  const res = await getMyLanguageRequests();

  return (
    <Card>
      <CardHeader className='items-center'>
        <CardTitle className='text-2xl'>{t('myTitle')}</CardTitle>
        <CardAction className='row-span-1 self-center'>
          <Link
            className={buttonVariants({ size: 'sm' })}
            href='/data/request-language'
          >
            {t('requestLanguage')}
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className='space-y-4'>
        {!res.success && <p>{t('errors.unknown')}</p>}
        {res.success && res.result.length === 0 && (
          <p className='text-soft-det'>{t('myEmpty')}</p>
        )}
        {res.success &&
          res.result.map(request => (
            <LanguageRequestCard key={request.id} request={request} />
          ))}
      </CardContent>
    </Card>
  );
}

export default MyLanguageRequests;
