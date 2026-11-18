import { getTranslations } from 'next-intl/server';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/core/components/ui/card';
import { getMyChangeRequests } from '../actions';
import ChangeRequestCard from './change-request-card';

async function MyChangeRequests() {
  const t = await getTranslations('ChangeRequests');
  const res = await getMyChangeRequests();

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-2xl'>{t('myTitle')}</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {!res.success && <p>{t('errors.unknown')}</p>}
        {res.success && res.result.length === 0 && (
          <p className='text-soft-det'>{t('myEmpty')}</p>
        )}
        {res.success &&
          res.result.map(request => (
            <ChangeRequestCard key={request.id} request={request} />
          ))}
      </CardContent>
    </Card>
  );
}

export default MyChangeRequests;
