import Check from '@/core/components/icons/check';
import Xcancel from '@/core/components/icons/x';

// import FeatureTooltip from '@/core/components/main/feature-tooltip';

type Props = {
  feat: {
    id: string;
    match: boolean;
  };
};

function Feature({ feat: { id, match } }: Props) {
  return (
    // <FeatureTooltip feature={feat} >
    <div className='md:h-12 bg-[#FDFBFB] flex items-center gap-2 rounded-[3px] shadow-xl p-1 md:p-3 border border-soft-det'>
      <span className='text-xl'>
        {match ? (
          <Check className='text-main' />
        ) : (
          <Xcancel className='text-[#FF2C2C]' />
        )}
      </span>
      {id}
    </div>
    // </FeatureTooltip>
  );
}
export default Feature;
