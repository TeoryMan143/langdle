import { getFormatter, getTranslations } from 'next-intl/server';
import { Badge } from '@/core/components/ui/badge';
import type { LanguageRequestDTO } from '../types';
import ChangeRequestStateBadge from './change-request-state-badge';

type Props = {
  request: LanguageRequestDTO;
  /** Who made the request, shown to the administrators only. */
  author?: string;
  children?: React.ReactNode;
};

async function LanguageRequestCard({ request, author, children }: Props) {
  const t = await getTranslations('LanguageRequests');
  const changeT = await getTranslations('ChangeRequests');
  const featureT = await getTranslations('Features.name');
  const format = await getFormatter();

  const date = (iso: string) =>
    format.dateTime(new Date(iso), { dateStyle: 'medium' });

  const groups = [
    { key: 'present', label: t('present'), list: request.features },
    { key: 'partial', label: t('partial'), list: request.partial },
  ] as const;

  return (
    <article className='bg-secondary-background border-2 border-border rounded-base shadow-shadow p-4 space-y-3'>
      <header className='flex flex-wrap items-center justify-between gap-2'>
        <h5 className='font-heading text-lg flex items-center gap-2'>
          {request.flagUrl && (
            <img
              src={request.flagUrl}
              alt={`${request.code} flag`}
              width={455}
              height={304}
              className='w-9 h-6 object-cover rounded-xs border-2 border-border'
            />
          )}
          {request.name}
          {request.exonym ? ` (${request.exonym})` : ''}
          <Badge variant='neutral'>{request.code}</Badge>
        </h5>
        <ChangeRequestStateBadge state={request.state} />
      </header>

      {groups.map(group => (
        <div key={group.key} className='space-y-1'>
          <p className='font-heading text-sm'>
            {group.label} ({group.list.length})
          </p>
          {group.list.length === 0 ? (
            <p className='text-sm text-foreground/70'>{t('none')}</p>
          ) : (
            <div className='flex flex-wrap gap-1'>
              {group.list.map(feature => (
                <Badge
                  key={feature}
                  className={
                    group.key === 'present'
                      ? 'bg-emerald-100 text-emerald-950'
                      : 'bg-amber-100 text-amber-950'
                  }
                >
                  {featureT(feature)}
                </Badge>
              ))}
            </div>
          )}
        </div>
      ))}

      <p className='whitespace-pre-line wrap-break-word'>
        {request.description}
      </p>

      {request.rejectionReason && (
        <p className='bg-red-100 text-red-950 border-2 border-border rounded-base p-3 whitespace-pre-line wrap-break-word'>
          <span className='font-heading'>{changeT('rejectionReason')}: </span>
          {request.rejectionReason}
        </p>
      )}

      <footer className='flex flex-wrap items-center justify-between gap-3 text-sm text-soft-det'>
        <span>
          {author ? `${changeT('requestedBy', { nickname: author })} · ` : ''}
          {changeT('sentOn', { date: date(request.createdAt) })}
          {request.reviewedAt &&
            ` · ${changeT('reviewedOn', { date: date(request.reviewedAt) })}`}
        </span>
        {children}
      </footer>
    </article>
  );
}

export default LanguageRequestCard;
