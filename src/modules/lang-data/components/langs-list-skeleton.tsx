import LoadingRegion from '@/core/components/main/loading-region';
import { Skeleton } from '@/core/components/ui/skeleton';
import LangRowSkeleton from './lang-row-skeleton';

const ROWS = 12;

/**
 * The languages list on its way: the rows of `LangsList`, under the search
 * box administrators get (`search`).
 */
function LangsListSkeleton({ search = true }: { search?: boolean }) {
  return (
    <LoadingRegion className='flex w-full max-w-xl flex-col items-stretch gap-4 px-10 lg:px-0'>
      {search && <Skeleton className='h-10 w-full' />}
      <div className='bg-background rounded-base border-2 border-border overflow-clip'>
        {Array.from({ length: ROWS }, (_, index) => (
          <LangRowSkeleton
            key={index}
            index={index}
            // `py-3` around a `text-xl` name (28px), plus the 1px border.
            className='h-[53px] justify-center border-b-2 border-border px-4'
          />
        ))}
      </div>
    </LoadingRegion>
  );
}

export default LangsListSkeleton;
