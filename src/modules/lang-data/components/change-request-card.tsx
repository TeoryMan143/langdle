import { getFormatter, getTranslations } from 'next-intl/server';
import type { FeatureStatus } from '@/core/types';
import type { ChangeRequestDTO } from '../types';
import ChangeRequestStateBadge from './change-request-state-badge';
import LangImage from './lang-image';

const STATUS_KEYS = {
  present: 'statusPresent',
  partial: 'statusPartial',
  absent: 'statusNotPresent',
} as const satisfies Record<FeatureStatus, string>;

type Props = {
  request: ChangeRequestDTO;
  /** Who made the request, shown to the administrators only. */
  author?: string;
  /** The status the feature has right now, for pending requests. */
  currentStatus?: FeatureStatus | null;
  children?: React.ReactNode;
};

async function ChangeRequestCard({
  request,
  author,
  currentStatus,
  children,
}: Props) {
  const t = await getTranslations('ChangeRequests');
  const statusT = await getTranslations('Features.changeRequest');
  const featureT = await getTranslations('Features.name');
  const langT = await getTranslations('Exonyms');
  const format = await getFormatter();

  const date = (iso: string) =>
    format.dateTime(new Date(iso), { dateStyle: 'medium' });

  return (
    <article className='bg-secondary-background border-2 border-border rounded-base shadow-shadow p-4 space-y-3'>
      <header className='flex flex-wrap items-center justify-between gap-2'>
        <h5 className='font-heading text-lg'>
          <LangImage code={request.lang} /> {langT(request.lang)} ·{' '}
          {featureT(request.feature)}
        </h5>
        <ChangeRequestStateBadge state={request.state} />
      </header>

      <p>
        {currentStatus && currentStatus !== request.status ? (
          <>
            <span className='font-heading'>
              {statusT(STATUS_KEYS[currentStatus])}
            </span>
            {' → '}
          </>
        ) : null}
        <span className='font-heading'>
          {statusT(STATUS_KEYS[request.status])}
        </span>
      </p>

      <p className='whitespace-pre-line wrap-break-word'>
        {request.description}
      </p>

      {request.rejectionReason && (
        <p className='bg-red-100 text-red-950 border-2 border-border rounded-base p-3 whitespace-pre-line wrap-break-word'>
          <span className='font-heading'>{t('rejectionReason')}: </span>
          {request.rejectionReason}
        </p>
      )}

      <footer className='flex flex-wrap items-center justify-between gap-3 text-sm text-soft-det'>
        <span>
          {author ? `${t('requestedBy', { nickname: author })} · ` : ''}
          {t('sentOn', { date: date(request.createdAt) })}
          {request.reviewedAt &&
            ` · ${t('reviewedOn', { date: date(request.reviewedAt) })}`}
        </span>
        {children}
      </footer>
    </article>
  );
}

export default ChangeRequestCard;
