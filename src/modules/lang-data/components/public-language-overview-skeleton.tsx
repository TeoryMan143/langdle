import LoadingRegion from '@/core/components/main/loading-region';
import { Skeleton } from '@/core/components/ui/skeleton';
import LanguageCardSkeleton from './language-card-skeleton';

/** The atlas counters, its search box and its first cards, on their way. */
function PublicLanguageOverviewSkeleton() {
  return (
    <LoadingRegion>
      <section className='mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {['languages', 'active', 'features', 'partial'].map(counter => (
          <div
            key={counter}
            className='rounded-2xl border-2 border-border bg-background p-4 shadow-shadow'
          >
            <div className='flex h-5 items-center'>
              <Skeleton className='h-3.5 w-28' />
            </div>
            <div className='mt-2 flex h-9 items-center'>
              <Skeleton className='h-7 w-20' />
            </div>
          </div>
        ))}
      </section>

      <section className='mt-6 space-y-4'>
        <div className='rounded-2xl border-2 border-border bg-background p-4 shadow-shadow'>
          <div className='mb-2 flex h-5 items-center'>
            <Skeleton className='h-3.5 w-32' />
          </div>
          <Skeleton className='h-10 w-full' />
        </div>
        <div className='grid gap-5 xl:grid-cols-2'>
          <LanguageCardSkeleton />
          <LanguageCardSkeleton />
          <LanguageCardSkeleton />
          <LanguageCardSkeleton />
        </div>
      </section>
    </LoadingRegion>
  );
}

export default PublicLanguageOverviewSkeleton;
