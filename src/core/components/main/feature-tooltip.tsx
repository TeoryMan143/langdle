import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';
import type { LangFeatures } from '@/core/lib/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

type Props = {
  feature: LangFeatures;
  children: React.ReactNode;
};
function FeatureToolTip({ feature, children }: Props) {
  const t = useTranslations('Features.description');

  const description = useMemo(() => t(feature), [feature, t]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent className='bg-white'>{description}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default React.memo(FeatureToolTip);
