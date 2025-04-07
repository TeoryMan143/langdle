import Check from '@/core/components/icons/check';
import Xcancel from '@/core/components/icons/x';

type Props = {
  feat: {
    id: string;
    match: boolean;
  };
};

function Feature({ feat: { id, match } }: Props) {
  return (
    <div className='h-12 bg-[#FDFBFB] flex items-center gap-2 rounded-[3px] shadow-xl p-3 border border-soft-det'>
      <span className='text-xl'>
        {match ? (
          <Check className='text-main' />
        ) : (
          <Xcancel className='text-[#FF2C2C]' />
        )}
      </span>
      {id}
    </div>
  );
}
export default Feature;
