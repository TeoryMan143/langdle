import { Skeleton } from '@/core/components/ui/skeleton';
import ReviewRequestsSkeleton from '@/modules/lang-data/components/review-requests-skeleton';

export default function ChangeRequestsLoading() {
  return (
    <main className='mt-5 space-y-6'>
      <PageTitle />
      <div className='flex justify-center'>
        <ReviewRequestsSkeleton />
      </div>
      <PageTitle />
      <div className='flex justify-center'>
        <ReviewRequestsSkeleton kind='language' />
      </div>
    </main>
  );
}

/** The change and the language requests titles: one 60px line of dongle. */
function PageTitle() {
  return (
    <div className='flex h-15 items-center justify-center'>
      <Skeleton className='h-10 w-64 bg-background' />
    </div>
  );
}
