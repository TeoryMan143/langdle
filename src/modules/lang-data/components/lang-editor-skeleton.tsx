import LoadingRegion from '@/core/components/main/loading-region';
import { Skeleton } from '@/core/components/ui/skeleton';
import { groupedLangFeatures } from '@/core/lib/features';

/**
 * A language's editor on its way: its title, the place fields and a column
 * per feature group, as the `data/[code]` page lays them out.
 */
function LangEditorSkeleton() {
  return (
    <LoadingRegion className='space-y-4'>
      <div className='flex h-8 justify-center items-center gap-2'>
        <Skeleton className='h-5 w-6 rounded-xs bg-background' />
        <Skeleton className='h-6 w-48 bg-background' />
      </div>
      <div className='flex justify-center'>
        <div className='w-full space-y-9'>
          <section className='mx-auto w-full max-w-3xl rounded-base border-2 border-border bg-background shadow-shadow overflow-hidden'>
            <div className='flex justify-center py-3 bg-secondary-background border-b-2 border-border'>
              <Skeleton className='h-7 w-32 bg-background' />
            </div>
            <div className='space-y-4 p-4'>
              <div>
                <div className='flex h-5 items-center'>
                  <Skeleton className='h-3.5 w-full' />
                </div>
                <div className='flex h-5 items-center'>
                  <Skeleton className='h-3.5 w-2/3' />
                </div>
              </div>
              <div className='grid gap-4 sm:grid-cols-2'>
                <LabelledInput />
                <LabelledInput />
              </div>
              <div className='space-y-2'>
                <div className='flex h-6 items-center'>
                  <Skeleton className='h-4 w-20' />
                </div>
                <div className='flex flex-wrap items-end gap-2'>
                  <LabelledInput className='w-32 space-y-1' />
                  <LabelledInput className='w-32 space-y-1' />
                  <Skeleton className='size-10' />
                  <Skeleton className='size-10' />
                </div>
                <Skeleton className='h-9 w-32' />
              </div>
            </div>
          </section>

          <div className='flex justify-center gap-9 flex-wrap'>
            {Object.entries(groupedLangFeatures).map(([group, features]) => (
              <section
                key={group}
                className='flex flex-col h-120 w-full max-w-lg bg-background border-2 border-border rounded-base shadow-shadow overflow-hidden'
              >
                <div className='flex justify-center py-3 bg-secondary-background border-b-2 border-border'>
                  <Skeleton className='h-7 w-40 bg-background' />
                </div>
                <div className='flex-1 min-h-0 overflow-hidden p-4 space-y-2'>
                  {features.map(feature => (
                    <Skeleton key={feature} className='h-11 w-full' />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </LoadingRegion>
  );
}

/** A `Label` (one 14px line) over an `Input`. */
function LabelledInput({ className = 'space-y-1.5' }: { className?: string }) {
  return (
    <div className={className}>
      <Skeleton className='h-3.5 w-16' />
      <Skeleton className='h-10 w-full' />
    </div>
  );
}

export default LangEditorSkeleton;
