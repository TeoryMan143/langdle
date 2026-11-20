import { Skeleton } from '@/core/components/ui/skeleton';
import { cn } from '@/core/lib/utils';
import PublicLanguageOverviewSkeleton from '@/modules/lang-data/components/public-language-overview-skeleton';

/** The title wraps to three lines on a phone, one from sm. */
const TITLE_LINES = [
  { width: 'w-44 sm:w-[32rem] sm:max-w-full' },
  { width: 'w-40', phoneOnly: true },
  { width: 'w-44', phoneOnly: true },
];

/** The intro wraps to four lines on a phone, two from md. */
const INTRO_LINES = [
  { width: 'w-full' },
  { width: 'w-[90%] md:w-[85%]' },
  { width: 'w-full', phoneOnly: true },
  { width: 'w-1/2', phoneOnly: true },
];

export default function PublicDataLoading() {
  return (
    <main className='mx-auto max-w-6xl px-4 py-6'>
      <section className='rounded-base border-2 border-border bg-background px-6 py-8 shadow-shadow sm:px-8'>
        <div className='space-y-4'>
          <div className='flex h-5 items-center'>
            <Skeleton className='h-3.5 w-36' />
          </div>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
            <div className='w-full max-w-3xl space-y-3'>
              <div className='text-4xl sm:text-5xl'>
                {TITLE_LINES.map(({ width, phoneOnly }, index) => (
                  <div
                    key={index}
                    className={cn(
                      'flex h-[1lh] items-center',
                      phoneOnly && 'sm:hidden',
                    )}
                  >
                    <Skeleton className={cn('h-7 sm:h-9', width)} />
                  </div>
                ))}
              </div>
              <div className='max-w-2xl text-base leading-7 sm:text-lg'>
                {INTRO_LINES.map(({ width, phoneOnly }, index) => (
                  <div
                    key={index}
                    className={cn(
                      'flex h-[1lh] items-center',
                      phoneOnly && 'md:hidden',
                    )}
                  >
                    <Skeleton className={cn('h-4', width)} />
                  </div>
                ))}
              </div>
            </div>
            <Skeleton className='h-10 w-full shrink-0 lg:w-44' />
          </div>
        </div>
      </section>
      <PublicLanguageOverviewSkeleton />
    </main>
  );
}
