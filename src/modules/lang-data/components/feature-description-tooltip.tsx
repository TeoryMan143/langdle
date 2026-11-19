'use client';

import type { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import { useTranslations } from 'next-intl';
import { Tooltip, TooltipContent } from '@/core/components/ui/tooltip';
import type { LangFeatures } from '@/core/types';

export type FeatureTooltipHandle = TooltipPrimitive.Handle<LangFeatures>;

/**
 * One feature description tooltip for every chip of the atlas. The chips are
 * detached `TooltipTrigger`s sharing `handle` and passing their feature as
 * `payload`, so the page holds a single tooltip instead of one per chip.
 *
 * Render it and the chips inside one `TooltipProvider`: the triggers read
 * their open delay from it.
 */
function FeatureDescriptionTooltip({
  handle,
}: {
  handle: FeatureTooltipHandle;
}) {
  const t = useTranslations('Features.description');

  return (
    <Tooltip handle={handle}>
      {({ payload }) =>
        payload ? (
          <TooltipContent className='bg-white'>
            {t(payload as LangFeatures)}
          </TooltipContent>
        ) : null
      }
    </Tooltip>
  );
}

export default FeatureDescriptionTooltip;
