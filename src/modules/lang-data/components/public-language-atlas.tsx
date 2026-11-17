'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import FeatureToolTip from '@/core/components/main/feature-tooltip';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { groupedLangFeatures } from '@/core/lib/features';
import type { LangFeatures, Language } from '@/core/types';
import ChangeRequestDialog from '@/modules/lang-data/components/change-request-dialog';
import LangImage from './lang-image';

type Props = {
  languages: Language[];
};

/**
 * Cards rendered at a time: the catalogue holds thousands of languages and each
 * card carries a dialog per feature, so they are revealed page by page.
 */
const PAGE_SIZE = 24;

const groupedEntries = Object.entries(groupedLangFeatures) as Array<
  [keyof typeof groupedLangFeatures, readonly LangFeatures[]]
>;

function FeatureChip({
  lang,
  feature,
  tone,
}: {
  lang: string;
  feature: LangFeatures;
  tone: 'present' | 'partial' | 'absent';
}) {
  return (
    <FeatureToolTip feature={feature}>
      <ChangeRequestDialog lang={lang} feature={feature} status={tone} />
    </FeatureToolTip>
  );
}

function LanguageCard({ language }: { language: Language }) {
  const t = useTranslations('PublicDataPage');

  const presentFeatures = new Set(language.features);
  const partialFeatures = new Set(language.partial);

  return (
    <article className='rounded-[1.75rem] border-2 border-border bg-background p-5 shadow-shadow'>
      <header className='flex flex-col gap-4 md:gap-10 sm:flex-row sm:items-start sm:justify-between'>
        <div className='flex items-start gap-4'>
          <LangImage code={language.id} className='mt-1 h-8 w-11 rounded-sm' />
          <div>
            <h2 className='text-2xl font-semibold'>{language.name}</h2>
            {language.exonym && (
              <p className='mt-1 text-sm text-foreground/70'>
                {language.exonym}
              </p>
            )}
            {language.family && (
              <p className='mt-1 text-xs text-foreground/60'>
                {/* An isolate is its own family and branch: say it once. */}
                {[...new Set([language.family, language.genus])]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
          </div>
        </div>

        <div className='flex flex-wrap gap-2 text-sm'>
          <span className='rounded-full border border-border bg-main px-3 py-1 font-medium text-main-foreground'>
            {language.active ? t('status.active') : t('status.inactive')}
          </span>
          <span className='rounded-full border border-border bg-secondary-background px-3 py-1 font-medium'>
            {language.features.length} {t('summary.activeFeatures')}
          </span>
          <span className='rounded-full border border-border bg-secondary-background px-3 py-1 font-medium'>
            {language.partial.length} {t('summary.partialFeatures')}
          </span>
        </div>
      </header>

      <div className='mt-5 grid gap-4'>
        {groupedEntries.map(([group, features]) => {
          const present = features.filter(feature =>
            presentFeatures.has(feature),
          );
          const partial = features.filter(feature =>
            partialFeatures.has(feature),
          );
          const absent = features.filter(
            feature =>
              !presentFeatures.has(feature) && !partialFeatures.has(feature),
          );

          if (!present.length && !partial.length && !absent.length) {
            return null;
          }

          return (
            <section
              key={group}
              className='rounded-2xl border border-border/70 p-4'
            >
              <h3 className='text-base font-semibold'>
                {t(`groups.${group}`)}
              </h3>
              <div className='mt-3 flex flex-wrap gap-2'>
                {present.map(feature => (
                  <FeatureChip
                    key={feature}
                    feature={feature}
                    tone='present'
                    lang={language.id}
                  />
                ))}
                {partial.map(feature => (
                  <FeatureChip
                    key={feature}
                    feature={feature}
                    tone='partial'
                    lang={language.id}
                  />
                ))}
                {absent.map(feature => (
                  <FeatureChip
                    key={feature}
                    feature={feature}
                    tone='absent'
                    lang={language.id}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </article>
  );
}

function PublicLanguageAtlas({ languages }: Props) {
  const t = useTranslations('PublicDataPage');
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filteredLanguages = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return languages;
    }

    return languages.filter(language => {
      const haystack = [
        language.id,
        language.name,
        language.exonym ?? '',
        ...language.searchParams,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [languages, query]);

  const shownLanguages = filteredLanguages.slice(0, visible);

  return (
    <section className='space-y-4'>
      <div className='rounded-2xl border-2 border-border bg-background p-4 shadow-shadow'>
        <label
          className='mb-2 block text-sm font-medium'
          htmlFor='public-lang-search'
        >
          {t('search.label')}
        </label>
        <Input
          id='public-lang-search'
          value={query}
          onChange={event => {
            setQuery(event.target.value);
            setVisible(PAGE_SIZE);
          }}
          placeholder={t('search.placeholder')}
        />
      </div>

      {filteredLanguages.length === 0 ? (
        <div className='rounded-2xl border-2 border-border bg-background p-8 text-center shadow-shadow'>
          <p className='text-lg font-medium'>{t('empty')}</p>
        </div>
      ) : (
        <>
          <div className='grid gap-5 xl:grid-cols-2'>
            {shownLanguages.map(language => (
              <LanguageCard key={language.id} language={language} />
            ))}
          </div>

          <div className='flex flex-col items-center gap-3'>
            <p className='text-sm text-foreground/70'>
              {t('showing', {
                shown: shownLanguages.length,
                total: filteredLanguages.length,
              })}
            </p>
            {shownLanguages.length < filteredLanguages.length && (
              <Button
                variant='neutral'
                onClick={() => setVisible(count => count + PAGE_SIZE)}
              >
                {t('showMore')}
              </Button>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default PublicLanguageAtlas;
