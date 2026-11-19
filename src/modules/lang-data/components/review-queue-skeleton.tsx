import LoadingRegion from '@/core/components/main/loading-region';
import { Skeleton } from '@/core/components/ui/skeleton';
import { cn } from '@/core/lib/utils';

const ROWS = 12;
const NAME_WIDTHS = ['w-40', 'w-28', 'w-48', 'w-36'];

/** The review queue on its way: its search box and its first rows. */
function ReviewQueueSkeleton() {
  return (
    <LoadingRegion className='space-y-4'>
      <Skeleton className='h-10 w-full' />
      <ul className='divide-y-2 divide-border overflow-hidden rounded-base border-2 border-border bg-secondary-background shadow-shadow'>
        {Array.from({ length: ROWS }, (_, index) => (
          <li
            key={index}
            className='flex flex-wrap items-center gap-3 px-4 py-3'
          >
            <Skeleton className='h-6 w-9 bg-background' />
            <div className='min-w-40 flex-1'>
              <div className='flex h-6 items-center'>
                <Skeleton
                  className={cn(
                    'h-4 bg-background',
                    NAME_WIDTHS[index % NAME_WIDTHS.length],
                  )}
                />
              </div>
              <div className='flex h-4 items-center'>
                <Skeleton className='h-3 w-36 bg-background' />
              </div>
            </div>
            <Skeleton className='h-7 w-30 bg-background' />
            <Skeleton className='h-9 w-19 bg-background' />
            <Skeleton className='h-9 w-21 bg-background' />
          </li>
        ))}
      </ul>
    </LoadingRegion>
  );
}

export default ReviewQueueSkeleton;
