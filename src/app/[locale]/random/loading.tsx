import { Skeleton } from '@/core/components/ui/skeleton';
import GameSkeleton from '@/modules/lang-guess/components/game-skeleton';

export default function RandomLoading() {
  return (
    <main className='pt-8'>
      {/* The title is one line of dongle: 40px high, 72px from md. */}
      <div className='mx-7 flex h-10 items-center justify-center md:h-18'>
        <Skeleton className='h-7 w-72 max-w-full bg-background md:h-12 md:w-140' />
      </div>
      <div className='grid place-content-center'>
        <Skeleton className='h-10 w-13 bg-background' />
      </div>
      <section className='mt-6 md:mt-10 flex justify-center'>
        <div className='w-68 md:min-w-2xl max-w-[90dvw] md:w-4xl'>
          <GameSkeleton />
        </div>
      </section>
    </main>
  );
}
