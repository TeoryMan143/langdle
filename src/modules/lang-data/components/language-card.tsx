'use client';

import { useTranslations } from 'next-intl';
import { memo } from 'react';
import { DialogTrigger } from '@/core/components/ui/dialog';
import { TooltipTrigger } from '@/core/components/ui/tooltip';
import { groupedLangFeatures } from '@/core/lib/features';
import { cn } from '@/core/lib/utils';
import type { FeatureStatus, LangFeatures, Language } from '@/core/types';
import type { ChangeRequestPayload } from '../types';
import type { ChangeRequestDialogHandle } from './change-request-dialog';
import type { FeatureTooltipHandle } from './feature-description-tooltip';
import LangImage from './lang-image';

/** The atlas' single dialog and tooltip, which every chip opens. */
export type LanguageCardHandles = {
  dialog: ChangeRequestDialogHandle;
  tooltip: FeatureTooltipHandle;
};

const groupedEntries = Object.entries(groupedLangFeatures) as Array<
  [keyof typeof groupedLangFeatures, readonly LangFeatures[]]
>;

/** The order a group lists its features in. */
const statusOrder = ['present', 'partial', 'absent'] as const;

/**
 * A language of the public atlas: its header and a chip per feature, grouped.
 *
 * Memoized: each loaded batch adds cards, and the ones already on screen must
 * not render again for it. `handles` never changes, so the memo holds.
 */
function LanguageCard({
  language,
  handles,
}: {
  language: Language;
  handles: LanguageCardHandles;
}) {
  const t = useTranslations('PublicDataPage');
  const featureT = useTranslations('Features.name');

  const presentFeatures = new Set(language.features);
  const partialFeatures = new Set(language.partial);

  const statusOf = (feature: LangFeatures): FeatureStatus =>
    presentFeatures.has(feature)
      ? 'present'
      : partialFeatures.has(feature)
        ? 'partial'
        : 'absent';

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
        {groupedEntries.map(([group, features]) => (
          <section
            key={group}
            className='rounded-2xl border border-border/70 p-4'
          >
            <h3 className='text-base font-semibold'>{t(`groups.${group}`)}</h3>
            <div className='mt-3 flex flex-wrap gap-2'>
              {statusOrder.flatMap(status =>
                features
                  .filter(feature => statusOf(feature) === status)
                  .map(feature => (
                    <FeatureChip
                      key={feature}
                      request={{ lang: language.id, feature, status }}
                      label={featureT(feature)}
                      handles={handles}
                    />
                  )),
              )}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}

/**
 * A bare button that is both a detached trigger of the atlas' tooltip and of
 * its change request dialog. Thousands of these render, so they hold no state
 * of their own.
 */
function FeatureChip({
  request,
  label,
  handles,
}: {
  request: ChangeRequestPayload;
  label: string;
  handles: LanguageCardHandles;
}) {
  const { feature, status } = request;

  return (
    <TooltipTrigger
      handle={handles.tooltip}
      payload={feature}
      render={
        <DialogTrigger
          handle={handles.dialog}
          payload={request}
          render={
            <button
              type='button'
              data-feature={feature}
              data-state={status}
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer',
                status === 'present' &&
                  'border-emerald-600 bg-emerald-100 text-emerald-950',
                status === 'partial' &&
                  'border-amber-500 bg-amber-100 text-amber-950',
                status === 'absent' &&
                  'border-border bg-secondary-background text-foreground/65 opacity-80',
              )}
            />
          }
        />
      }
    >
      {label}
    </TooltipTrigger>
  );
}

export default memo(LanguageCard);
