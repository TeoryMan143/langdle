import { Skeleton } from '@/core/components/ui/skeleton';

/**
 * A change or language request card on its way, line for line with
 * `ChangeRequestCard` (or `LanguageRequestCard`): a title line, the status
 * (or the present and partial features), the description and the dates,
 * with the review buttons of a pending request. Each line is a box of its
 * text's line height.
 */
function RequestCardSkeleton({
  kind = 'change',
  actions = false,
}: {
  /** A language request lists its present and partial features. */
  kind?: 'change' | 'language';
  /** Draws the accept and reject buttons of a pending request. */
  actions?: boolean;
}) {
  return (
    <article className='bg-secondary-background border-2 border-border rounded-base shadow-shadow p-4 space-y-3'>
      <header className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex h-7 items-center gap-2'>
          <Skeleton className='h-5 w-6 rounded-xs bg-background' />
          <Skeleton className='h-4.5 w-40 bg-background' />
        </div>
        <Skeleton className='h-6 w-18 bg-background' />
      </header>
      {kind === 'change' ? (
        <div className='flex h-6 items-center'>
          <Skeleton className='h-4 w-20 bg-background' />
        </div>
      ) : (
        [3, 1].map(count => (
          <div key={count} className='space-y-1'>
            <div className='flex h-5 items-center'>
              <Skeleton className='h-3.5 w-20 bg-background' />
            </div>
            <div className='flex flex-wrap gap-1'>
              {Array.from({ length: count }, (_, index) => (
                <Skeleton key={index} className='h-6 w-16 bg-background' />
              ))}
            </div>
          </div>
        ))
      )}
      {/* One line of description from md, two on a phone. */}
      <div>
        <div className='flex h-6 items-center'>
          <Skeleton className='h-4 w-full bg-background md:w-3/4' />
        </div>
        <div className='flex h-6 items-center md:hidden'>
          <Skeleton className='h-4 w-1/3 bg-background' />
        </div>
      </div>
      <footer className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex h-5 items-center'>
          <Skeleton className='h-3.5 w-52 bg-background' />
        </div>
        {actions && (
          <div className='flex gap-2'>
            <Skeleton className='h-9 w-17 bg-background' />
            <Skeleton className='h-9 w-16 bg-background' />
          </div>
        )}
      </footer>
    </article>
  );
}

export default RequestCardSkeleton;
