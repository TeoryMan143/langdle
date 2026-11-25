import LoadingRegion from '@/core/components/main/loading-region';
import { Skeleton } from '@/core/components/ui/skeleton';

/** The viewer on its way: its filters and its first rows. */
function GameLogsSkeleton() {
  return (
    <LoadingRegion className='space-y-4'>
      <Skeleton className='h-22 w-full' />
      <Skeleton className='h-8 w-80' />
      <ul className='divide-y-2 divide-border overflow-hidden rounded-base border-2 border-border bg-secondary-background shadow-shadow'>
        {Array.from({ length: 10 }, (_, index) => (
          <li key={index} className='flex items-center gap-3 px-4 py-3'>
            <Skeleton className='h-4 w-20 bg-background' />
            <Skeleton className='h-5 w-14 bg-background' />
            <Skeleton className='h-4 w-40 bg-background' />
            <Skeleton className='ml-auto h-4 w-32 bg-background' />
          </li>
        ))}
      </ul>
    </LoadingRegion>
  );
}

export default GameLogsSkeleton;
