'use client';

import { ArrowUp } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import Ball from '@/core/components/icons/ball';
import Check from '@/core/components/icons/check';
import Xcancel from '@/core/components/icons/x';
import type { GuessHints as Hints } from '../types';

const RELATION = {
  genus: { key: 'hintSameGenus', Icon: Check, tone: 'text-main' },
  family: { key: 'hintSameFamily', Icon: Ball, tone: 'text-amber-400' },
  none: { key: 'hintOtherFamily', Icon: Xcancel, tone: 'text-[#FF2C2C]' },
} as const;

const pill =
  'inline-flex items-center gap-1 rounded-base border-2 border-border bg-white px-1.5 py-0.5 text-xs';

/** Distance and direction to the target, and how related the guess is. */
function GuessHints({ hints }: { hints?: Hints }) {
  const t = useTranslations('Game');
  const format = useFormatter();

  if (!hints || (hints.distanceKm === undefined && !hints.relation)) {
    return null;
  }

  const relation = hints.relation && RELATION[hints.relation];

  return (
    <div className='mt-1.5 flex flex-wrap justify-center gap-1'>
      {hints.distanceKm !== undefined && (
        <span className={pill}>
          {hints.bearing !== undefined && (
            <ArrowUp
              aria-label={t('hintDirection')}
              className='size-3.5'
              strokeWidth={2.5}
              style={{ transform: `rotate(${hints.bearing}deg)` }}
            />
          )}
          {t('hintDistance', { km: format.number(hints.distanceKm) })}
        </span>
      )}
      {relation && (
        <span className={pill}>
          <relation.Icon className={`size-3 ${relation.tone}`} />
          {t(relation.key)}
        </span>
      )}
    </div>
  );
}

export default GuessHints;
