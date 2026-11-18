import LoadingRegion from '@/core/components/main/loading-region';
import { Skeleton } from '@/core/components/ui/skeleton';
import RequestCardSkeleton from './request-card-skeleton';

/**
 * An administrator's list of change or language requests on its way: the
 * pending and the reviewed section, as `ReviewChangeRequests` and
 * `ReviewLanguageRequests` draw them.
 */
function ReviewRequestsSkeleton({
  kind = 'change',
}: {
  kind?: 'change' | 'language';
}) {
  return (
    <LoadingRegion className='space-y-8 w-full max-w-3xl'>
      <section className='space-y-4'>
        <SectionTitle />
        <RequestCardSkeleton kind={kind} actions />
        <RequestCardSkeleton kind={kind} actions />
      </section>
      <section className='space-y-4'>
        <SectionTitle />
        <RequestCardSkeleton kind={kind} />
      </section>
    </LoadingRegion>
  );
}

/** A section's `text-2xl` heading: one 32px line. */
function SectionTitle() {
  return (
    <div className='flex h-8 items-center'>
      <Skeleton className='h-6 w-32 bg-background' />
    </div>
  );
}

export default ReviewRequestsSkeleton;
