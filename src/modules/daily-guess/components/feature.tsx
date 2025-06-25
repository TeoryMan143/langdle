import { useTranslations } from 'next-intl';
import Check from '@/core/components/icons/check';
import Xcancel from '@/core/components/icons/x';
import FeatureTooltip from '@/core/components/main/feature-tooltip';
import { LangFeatures } from '@/core/lib/types';

type Props = {
  id: LangFeatures;
  match?: boolean;
};

function Feature({ id, match = false }: Props) {
  const t = useTranslations('Features.name');

  return (
    <FeatureTooltip feature={id}>
      <div className='md:h-12 bg-[#FDFBFB] flex items-center gap-2 rounded-[3px] shadow-xl p-1 md:p-3 border border-soft-det'>
        <span className='text-xl'>
          {match ? (
            <Check className='text-main' />
          ) : (
            <Xcancel className='text-[#FF2C2C]' />
          )}
        </span>
        {t(id)}
      </div>
    </FeatureTooltip>
  );
}
export default Feature;
