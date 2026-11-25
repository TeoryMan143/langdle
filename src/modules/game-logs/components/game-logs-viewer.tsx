'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import Loading from '@/core/components/icons/loading';
import { Badge } from '@/core/components/ui/badge';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Label } from '@/core/components/ui/label';
import { cn } from '@/core/lib/utils';
import LangImage from '@/modules/lang-data/components/lang-image';
import LoadMore from '@/modules/lang-data/components/load-more';
import { useGameLogs } from '../hooks/use-game-logs';
import {
  type GameLogEvent,
  type GameLogPage,
  gameLogEvents,
  type StoredGameLog,
} from '../types';

type Props = {
  /** The first batch of `initialDate`, read by the server. */
  initialPage: GameLogPage;
  /** Today in UTC, `yyyy-mm-dd`: the newest day there can be logs for. */
  initialDate: string;
  pageSize: number;
};

type EventFilter = GameLogEvent | 'all';

/** The game's own green and red for how a game ended. */
const EVENT_STYLES: Record<GameLogEvent, string> = {
  start: 'bg-main text-main-foreground',
  guess: 'bg-secondary-background',
  win: 'bg-emerald-300',
  lose: 'bg-danger text-white',
};

/** What the search box looks into, besides the languages. */
function searchText(log: StoredGameLog) {
  return [
    log.gameId,
    log.visitorId,
    log.targetLang,
    log.guessLang,
    log.user?.nickname,
    log.user?.email,
    log.user?.id,
    log.request.ip,
    log.request.country,
    log.request.city,
    log.client?.platform,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/**
 * One UTC day of game events for administrators, newest first, read batch by
 * batch as they scroll. The event and search filters apply to the batches
 * already loaded.
 */
function GameLogsViewer({ initialPage, initialDate, pageSize }: Props) {
  const t = useTranslations('GameLogsPage');
  const locale = useLocale();

  const [date, setDate] = useState(initialDate);
  const [eventFilter, setEventFilter] = useState<EventFilter>('all');
  const [search, setSearch] = useState('');

  const {
    data,
    isError,
    isFetching,
    isPlaceholderData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refresh,
  } = useGameLogs({ date, limit: pageSize, initialPage, initialDate });

  const logs = useMemo(
    () => data?.pages.flatMap(page => page.items) ?? [],
    [data],
  );
  const total = data?.pages[0]?.total ?? 0;
  const loadingDay = isPlaceholderData && isFetching;

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return logs.filter(
      log =>
        (eventFilter === 'all' || log.event === eventFilter) &&
        (!needle || searchText(log).includes(needle)),
    );
  }, [eventFilter, logs, search]);

  // UTC like the day picker, and the same on the server and in the browser.
  const time = new Intl.DateTimeFormat(locale, {
    timeStyle: 'medium',
    timeZone: 'UTC',
  });

  return (
    <section className='space-y-4'>
      <div className='flex flex-wrap items-end gap-3 rounded-base border-2 border-border bg-secondary-background p-4 shadow-shadow'>
        <div className='space-y-1'>
          <Label htmlFor='log-day'>{t('day')}</Label>
          <Input
            id='log-day'
            type='date'
            className='w-44'
            value={date}
            max={initialDate}
            onChange={event =>
              event.target.value && setDate(event.target.value)
            }
          />
        </div>
        <div className='min-w-48 flex-1 space-y-1'>
          <Label htmlFor='log-search'>{t('search')}</Label>
          <Input
            id='log-search'
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={t('searchPlaceholder')}
          />
        </div>
        <Button
          variant='neutral'
          disabled={isFetching}
          onClick={() => refresh()}
        >
          {isFetching && !isFetchingNextPage && <Loading className='size-5' />}
          {t('refresh')}
        </Button>
      </div>

      <div className='flex flex-wrap items-center gap-2'>
        {(['all', ...gameLogEvents] as const).map(event => (
          <Button
            key={event}
            size='sm'
            variant={eventFilter === event ? 'default' : 'neutral'}
            aria-pressed={eventFilter === event}
            onClick={() => setEventFilter(event)}
          >
            {t(`events.${event}`)}
          </Button>
        ))}
        <p className='ml-auto text-sm text-foreground/70'>
          {t('showing', { shown: shown.length, loaded: logs.length, total })}
        </p>
      </div>

      {isError && logs.length === 0 && (
        <p className='rounded-base border-2 border-border bg-secondary-background p-8 text-center text-danger shadow-shadow'>
          {t('loadError')}
        </p>
      )}

      {!isError && logs.length === 0 && !loadingDay && (
        <p className='rounded-base border-2 border-border bg-secondary-background p-8 text-center shadow-shadow'>
          {t('empty')}
        </p>
      )}

      {logs.length > 0 && shown.length === 0 && (
        <p className='rounded-base border-2 border-border bg-secondary-background p-8 text-center shadow-shadow'>
          {t('noMatches')}
        </p>
      )}

      {shown.length > 0 && (
        <ul
          aria-busy={loadingDay}
          className={cn(
            'divide-y-2 divide-border overflow-hidden rounded-base border-2 border-border bg-secondary-background shadow-shadow transition-opacity',
            loadingDay && 'opacity-60',
          )}
        >
          {shown.map(log => (
            <LogRow
              key={log.id}
              log={log}
              time={time.format(new Date(log.at))}
              onFilterGame={() => {
                setEventFilter('all');
                setSearch(log.gameId);
              }}
            />
          ))}
        </ul>
      )}

      <LoadMore
        hasNextPage={hasNextPage && !isPlaceholderData}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
        label={t('showMore')}
      />
    </section>
  );
}

function LogRow({
  log,
  time,
  onFilterGame,
}: {
  log: StoredGameLog;
  time: string;
  onFilterGame: () => void;
}) {
  const t = useTranslations('GameLogsPage');
  const { request, user, client } = log;
  const place = [request.city, request.region, request.country]
    .filter(Boolean)
    .join(', ');
  const hasCoordinates =
    request.latitude !== undefined && request.longitude !== undefined;

  return (
    <li>
      <details className='group'>
        <summary className='flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-background'>
          <span className='w-20 font-mono text-xs text-foreground/70'>
            {time}
          </span>
          <Badge className={cn('w-14', EVENT_STYLES[log.event])}>
            {t(`events.${log.event}`)}
          </Badge>
          <span className='flex items-center gap-1.5 font-heading'>
            <LangImage code={log.targetLang} className='h-4 w-6' />
            {log.targetLang}
            {log.guessLang && (
              <>
                <span className='font-base text-foreground/60'>←</span>
                <LangImage code={log.guessLang} className='h-4 w-6' />
                {log.guessLang}
              </>
            )}
          </span>
          <span className='text-xs text-foreground/70'>
            {t(`types.${log.type}`)}
            {log.attempt !== undefined &&
              ` · ${t('attempt', { attempt: log.attempt })}`}
            {log.resumed && ` · ${t('resumed')}`}
          </span>
          <span className='ml-auto flex flex-wrap items-center gap-x-3 text-sm'>
            <span className={cn(!user && 'text-foreground/60')}>
              {user ? user.nickname : t('anonymous')}
            </span>
            <span className='font-mono text-xs text-foreground/70'>
              {[place, request.ip].filter(Boolean).join(' · ') || t('unknown')}
            </span>
            {client?.platform && (
              <Badge variant='neutral'>{client.platform}</Badge>
            )}
          </span>
        </summary>

        <div className='grid gap-4 border-t-2 border-border bg-background px-4 py-4 md:grid-cols-2'>
          <Fields
            title={t('sections.game')}
            fields={{
              gameId: log.gameId,
              visitorId: log.visitorId,
              at: log.at,
              id: log.id,
            }}
          >
            <Button size='sm' variant='neutral' onClick={onFilterGame}>
              {t('filterGame')}
            </Button>
          </Fields>
          <Fields
            title={t('sections.player')}
            fields={user ?? {}}
            empty={t('anonymous')}
          />
          <Fields title={t('sections.request')} fields={request}>
            {hasCoordinates && (
              <a
                className='text-sm underline'
                href={`https://www.openstreetmap.org/?mlat=${request.latitude}&mlon=${request.longitude}#map=10/${request.latitude}/${request.longitude}`}
                target='_blank'
                rel='noopener noreferrer'
              >
                {t('openMap')}
              </a>
            )}
          </Fields>
          <Fields
            title={t('sections.device')}
            fields={client ?? {}}
            empty={t('unknown')}
          />
        </div>
      </details>
    </li>
  );
}

function formatValue(value: unknown) {
  if (value && typeof value === 'object') {
    return Array.isArray(value)
      ? value.join(', ')
      : Object.values(value).join(' × ');
  }

  return String(value);
}

/** A section of the details: field names as the API stores them. */
function Fields({
  title,
  fields,
  empty,
  children,
}: {
  title: string;
  fields: object;
  empty?: string;
  children?: React.ReactNode;
}) {
  const entries = Object.entries(fields).filter(
    ([, value]) => value !== undefined && value !== null && value !== '',
  );

  return (
    <div className='space-y-2'>
      <h3 className='font-mono text-[11px] uppercase tracking-[0.2em] text-soft-det'>
        {title}
      </h3>
      {entries.length === 0 ? (
        <p className='text-sm text-foreground/60'>{empty}</p>
      ) : (
        <dl className='grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm'>
          {entries.map(([key, value]) => (
            <div key={key} className='contents'>
              <dt className='font-mono text-xs leading-5 text-foreground/60'>
                {key}
              </dt>
              <dd className='break-all'>{formatValue(value)}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </div>
  );
}

export default GameLogsViewer;
