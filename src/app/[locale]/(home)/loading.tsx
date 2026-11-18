import { Skeleton } from '@/core/components/ui/skeleton';
import { cn } from '@/core/lib/utils';
import GameSkeleton from '@/modules/lang-guess/components/game-skeleton';

/** The intro wraps to five lines on a phone and to three from md. */
const INTRO_LINES = [
  { width: 'w-[95%]' },
  { width: 'w-full' },
  { width: 'w-[95%] md:w-3/4' },
  { width: 'w-[95%]', phoneOnly: true },
  { width: 'w-1/2', phoneOnly: true },
];

export default function HomeLoading() {
  return (
    <main className='pt-8'>
      {/* The title is one line of dongle: 40px high, 72px from md. */}
      <div className='mx-7 flex h-10 items-center justify-center md:h-18'>
        <Skeleton className='h-7 w-80 max-w-full bg-background md:h-12 md:w-160' />
      </div>
      <div className='mx-auto mt-2 max-w-2xl px-7 text-sm leading-relaxed md:text-base'>
        {INTRO_LINES.map(({ width, phoneOnly }, index) => (
          <div
            key={index}
            className={cn(
              'flex h-[1lh] items-center justify-center',
              phoneOnly && 'md:hidden',
            )}
          >
            <Skeleton className={cn('h-3 bg-background md:h-4', width)} />
          </div>
        ))}
      </div>
      <div className='mt-4 grid place-content-center'>
        <Skeleton className='h-10 w-13 bg-background' />
      </div>
      <section className='mt-6 md:mt-10 flex justify-center'>
        <div className='w-68 md:min-w-2xl max-w-[90dvw] md:w-4xl'>
          <GameSkeleton daily />
        </div>
      </section>
    </main>
  );
}
