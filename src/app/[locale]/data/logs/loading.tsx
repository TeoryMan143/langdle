import { Skeleton } from '@/core/components/ui/skeleton';
import GameLogsSkeleton from '@/modules/game-logs/components/game-logs-skeleton';

export default function GameLogsLoading() {
  return (
    <main className='mx-auto mt-5 max-w-6xl space-y-6 px-4 pb-10'>
      {/* The title is one 60px line of dongle. */}
      <div className='flex h-15 items-center justify-center'>
        <Skeleton className='h-10 w-56 bg-background' />
      </div>
      <div className='flex h-6 items-center justify-center'>
        <Skeleton className='h-4 w-full max-w-xl bg-background' />
      </div>
      <GameLogsSkeleton />
    </main>
  );
}
