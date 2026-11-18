import { Skeleton } from '@/core/components/ui/skeleton';
import ReviewQueueSkeleton from '@/modules/lang-data/components/review-queue-skeleton';

export default function ReviewLoading() {
  return (
    <main className='mx-auto mt-5 max-w-4xl space-y-6 px-4 pb-10'>
      {/* The title is one 60px line of dongle. */}
      <div className='flex h-15 items-center justify-center'>
        <Skeleton className='h-10 w-56 bg-background' />
      </div>
      {/* The intro: three lines on a phone, two from md. */}
      <div>
        <div className='flex h-6 items-center justify-center'>
          <Skeleton className='h-4 w-full bg-background' />
        </div>
        <div className='flex h-6 items-center justify-center'>
          <Skeleton className='h-4 w-full bg-background md:w-16' />
        </div>
        <div className='flex h-6 items-center justify-center md:hidden'>
          <Skeleton className='h-4 w-4/5 bg-background' />
        </div>
      </div>
      <ReviewQueueSkeleton />
    </main>
  );
}
