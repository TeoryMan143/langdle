import { getFormatter, getTranslations } from 'next-intl/server';
import { Badge } from '@/core/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/core/components/ui/card';
import { cn } from '@/core/lib/utils';
import { getLanguage } from '@/modules/lang-data/actions';
import LangImage from '@/modules/lang-data/components/lang-image';
import { getGameHistory } from '../actions';

/**
 * The user's finished games, newest first. The list scrolls inside the card,
 * so the card can be given any height (`className`).
 */
async function GameHistory({ className }: { className?: string }) {
  const historyRes = await getGameHistory();
  const t = await getTranslations('AccountPage');
  const ex = await getTranslations('Exonyms');
  const format = await getFormatter();

  return (
    <Card className={cn('min-h-0', className)}>
      <CardHeader className='border-b-2 border-border pb-(--card-spacing)'>
        <CardTitle className='flex items-center justify-between gap-2 text-2xl'>
          {t('gameHistory')}
          {historyRes.success && historyRes.result.length > 0 && (
            <Badge variant='neutral' className='text-sm'>
              {historyRes.result.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className='flex-1 min-h-0 overflow-y-auto space-y-3'>
        {!historyRes.success && <p>{t('unknownError')}</p>}
        {historyRes.success && historyRes.result.length === 0 && (
          <p className='text-soft-det'>{t('noGames')}</p>
        )}
        {historyRes.success &&
          historyRes.result.map(
            async ({ id, date, guessed, guesses, targetLang, type }) => {
              const langRes = await getLanguage(targetLang);
              const name = langRes.success ? langRes.result.name : targetLang;
              const exonym = ex.has(targetLang)
                ? ex(targetLang)
                : langRes.success
                  ? langRes.result.exonym
                  : undefined;

              return (
                <article
                  key={id}
                  className='bg-secondary-background border-2 border-border rounded-base px-4 py-3 space-y-2'
                >
                  <header className='flex items-center justify-between gap-2 text-sm text-soft-det font-heading'>
                    <span>{t(type === 'daily' ? 'daily' : 'random')}</span>
                    <time dateTime={date}>
                      {/* A calendar date: format it as is, not in local time. */}
                      {format.dateTime(new Date(date), {
                        dateStyle: 'medium',
                        timeZone: 'UTC',
                      })}
                    </time>
                  </header>
                  <p className='flex items-center gap-2 font-heading text-lg'>
                    <LangImage code={targetLang} />
                    <span className='min-w-0'>
                      {name}
                      {exonym && exonym !== name && ` (${exonym})`}
                    </span>
                  </p>
                  <div className='flex flex-wrap gap-2'>
                    <Badge
                      className={cn(
                        guessed
                          ? 'bg-emerald-100 text-emerald-950'
                          : 'bg-red-100 text-red-950',
                      )}
                    >
                      {t('guessed')}: {t(guessed ? 'yes' : 'no')}
                    </Badge>
                    <Badge variant='neutral'>
                      {t('guesses')}: {guesses}
                    </Badge>
                  </div>
                </article>
              );
            },
          )}
      </CardContent>
    </Card>
  );
}

export default GameHistory;
