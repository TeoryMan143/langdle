import { getTranslations } from 'next-intl/server';
import { getLanguageRequests } from '../actions';
import LanguageRequestCard from './language-request-card';
import ReviewActions from './review-actions';

async function ReviewLanguageRequests() {
  const t = await getTranslations('LanguageRequests');
  const changeT = await getTranslations('ChangeRequests');
  const res = await getLanguageRequests();

  if (!res.success) {
    return <p className='text-center'>{t('errors.unknown')}</p>;
  }

  // The API answers newest first; the oldest pending request goes on top.
  const pending = res.result.filter(r => r.state === 'pending').reverse();
  const reviewed = res.result.filter(r => r.state !== 'pending');

  return (
    <div className='space-y-8 w-full max-w-3xl'>
      <section className='space-y-4'>
        <h3 className='text-2xl font-heading'>{changeT('pendingTitle')}</h3>
        {pending.length === 0 && <p>{changeT('pendingEmpty')}</p>}
        {pending.map(request => (
          <LanguageRequestCard
            key={request.id}
            request={request}
            author={request.user.nickname}
          >
            <ReviewActions
              kind='language'
              requestId={request.id}
              nickname={request.user.nickname}
            />
          </LanguageRequestCard>
        ))}
      </section>

      <section className='space-y-4'>
        <h3 className='text-2xl font-heading'>{changeT('reviewedTitle')}</h3>
        {reviewed.length === 0 && <p>{changeT('reviewedEmpty')}</p>}
        {reviewed.map(request => (
          <LanguageRequestCard
            key={request.id}
            request={request}
            author={request.user.nickname}
          />
        ))}
      </section>
    </div>
  );
}

export default ReviewLanguageRequests;
