import { getTranslations } from 'next-intl/server';
import { getChangeRequests } from '../actions';
import ChangeRequestCard from './change-request-card';
import ReviewActions from './review-actions';

async function ReviewChangeRequests() {
  const t = await getTranslations('ChangeRequests');
  const res = await getChangeRequests();

  if (!res.success) {
    return <p className='text-center'>{t('errors.unknown')}</p>;
  }

  // The API answers newest first; the oldest pending request goes on top.
  const pending = res.result.filter(r => r.state === 'pending').reverse();
  const reviewed = res.result.filter(r => r.state !== 'pending');

  return (
    <div className='space-y-8 w-full max-w-3xl'>
      <section className='space-y-4'>
        <h3 className='text-2xl font-heading'>{t('pendingTitle')}</h3>
        {pending.length === 0 && <p>{t('pendingEmpty')}</p>}
        {pending.map(request => (
          <ChangeRequestCard
            key={request.id}
            request={request}
            author={request.user.nickname}
            currentStatus={request.currentStatus}
          >
            <ReviewActions
              requestId={request.id}
              nickname={request.user.nickname}
            />
          </ChangeRequestCard>
        ))}
      </section>

      <section className='space-y-4'>
        <h3 className='text-2xl font-heading'>{t('reviewedTitle')}</h3>
        {reviewed.length === 0 && <p>{t('reviewedEmpty')}</p>}
        {reviewed.map(request => (
          <ChangeRequestCard
            key={request.id}
            request={request}
            author={request.user.nickname}
          />
        ))}
      </section>
    </div>
  );
}

export default ReviewChangeRequests;
