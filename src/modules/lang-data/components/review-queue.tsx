'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import Loading from '@/core/components/icons/loading';
import { Button, buttonVariants } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import type { Language } from '@/core/types';
import { Link } from '@/i18n/navigation';
import { setLangStatus } from '../actions';
import LangImage from './lang-image';

const PAGE_SIZE = 50;

/** Best described first; languages that were never imported go last. */
function byCoverage(a: Language, b: Language) {
  const coverage = (b.coverage ?? -1) - (a.coverage ?? -1);
  return coverage || a.name.localeCompare(b.name);
}

/**
 * The inactive languages an administrator still has to review, each with a
 * link to its editor and a one-click activation.
 */
function ReviewQueue({ languages }: { languages: Language[] }) {
  const t = useTranslations('ReviewPage');
  const langT = useTranslations('LangData');

  const [queue, setQueue] = useState(() =>
    languages.filter(language => !language.active).sort(byCoverage),
  );
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [activating, setActivating] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return queue;
    }

    return queue.filter(language =>
      [
        language.id,
        language.name,
        language.exonym ?? '',
        ...language.searchParams,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    );
  }, [queue, query]);

  const shown = filtered.slice(0, visible);

  const activate = async (language: Language) => {
    setActivating(language.id);
    const res = await setLangStatus(language.id, true);
    setActivating(null);

    if (!res.success) {
      return toast.error(langT(res.error));
    }

    setQueue(current => current.filter(({ id }) => id !== language.id));
    toast.success(t('activated', { name: language.exonym ?? language.name }));
  };

  if (queue.length === 0) {
    return (
      <p className='rounded-base border-2 border-border bg-secondary-background p-8 text-center shadow-shadow'>
        {t('empty')}
      </p>
    );
  }

  return (
    <section className='space-y-4'>
      <Input
        value={query}
        onChange={event => {
          setQuery(event.target.value);
          setVisible(PAGE_SIZE);
        }}
        placeholder={t('searchPlaceholder')}
        aria-label={t('searchPlaceholder')}
      />

      <ul className='divide-y-2 divide-border overflow-hidden rounded-base border-2 border-border bg-secondary-background shadow-shadow'>
        {shown.map(language => (
          <li
            key={language.id}
            className='flex flex-wrap items-center gap-3 px-4 py-3'
          >
            <LangImage code={language.id} className='h-6 w-9' />
            <div className='min-w-40 flex-1'>
              <p className='font-heading'>
                {language.name}
                {language.exonym && ` (${language.exonym})`}
              </p>
              <p className='text-xs text-foreground/70'>
                {[language.id, ...new Set([language.family, language.genus])]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <span className='rounded-base border-2 border-border bg-background px-2 py-0.5 text-sm'>
              {language.coverage === undefined
                ? t('noCoverage')
                : t('coverage', {
                    percent: Math.round(language.coverage * 100),
                  })}
            </span>
            <Link
              className={buttonVariants({ variant: 'neutral', size: 'sm' })}
              href={`/data/${language.id}`}
            >
              {t('inspect')}
            </Link>
            <Button
              size='sm'
              disabled={activating !== null}
              onClick={() => activate(language)}
            >
              {activating === language.id ? <Loading /> : t('activate')}
            </Button>
          </li>
        ))}
      </ul>

      <div className='flex flex-col items-center gap-3'>
        <p className='text-sm text-foreground/70'>
          {t('showing', { shown: shown.length, total: filtered.length })}
        </p>
        {shown.length < filtered.length && (
          <Button
            variant='neutral'
            onClick={() => setVisible(count => count + PAGE_SIZE)}
          >
            {t('showMore')}
          </Button>
        )}
      </div>
    </section>
  );
}

export default ReviewQueue;
