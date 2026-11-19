import { Skeleton } from '@/core/components/ui/skeleton';
import LangsListSkeleton from '@/modules/lang-data/components/langs-list-skeleton';

export default function DataLoading() {
  return (
    <main className='mt-5'>
      {/* The title is one 60px line of dongle. */}
      <div className='mb-5 flex h-15 items-center justify-center'>
        <Skeleton className='h-10 w-60 bg-background' />
      </div>
      {/* An administrator's four links; editors have the first two. */}
      <div className='flex justify-center gap-3 flex-wrap mb-6'>
        <Skeleton className='h-10 w-[9.5rem]' />
        <Skeleton className='h-10 w-[8.25rem]' />
        <Skeleton className='h-10 w-[9.75rem]' />
        <Skeleton className='h-10 w-[6.25rem]' />
      </div>
      <div className='flex justify-center'>
        <LangsListSkeleton />
      </div>
    </main>
  );
}
