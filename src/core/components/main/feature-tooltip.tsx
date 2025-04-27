import type { LangFeatures } from '@/core/lib/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { useTranslations } from 'next-intl';

type Props = {
  feature: LangFeatures;
  children: React.ReactNode;
};
function FeatureToolTip({ feature, children }: Props) {
  const t = useTranslations('Features.description');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent className='bg-white'>{t(feature)}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default FeatureToolTip;
