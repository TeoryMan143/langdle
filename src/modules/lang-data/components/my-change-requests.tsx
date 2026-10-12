import { getTranslations } from 'next-intl/server';
import { getMyChangeRequests } from '../actions';
import ChangeRequestCard from './change-request-card';

async function MyChangeRequests() {
  const t = await getTranslations('ChangeRequests');
  const res = await getMyChangeRequests();

  return (
    <section className='p-5 bg-background border-2 rounded-base space-y-3 w-full max-w-3xl'>
      <h4 className='text-2xl font-bold text-center'>{t('myTitle')}</h4>
      {!res.success && <p>{t('errors.unknown')}</p>}
      {res.success && res.result.length === 0 && <p>{t('myEmpty')}</p>}
      {res.success && (
        <div className='space-y-4'>
          {res.result.map(request => (
            <ChangeRequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </section>
  );
}

export default MyChangeRequests;
