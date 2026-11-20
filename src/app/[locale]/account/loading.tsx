import { Skeleton } from '@/core/components/ui/skeleton';
import GameHistorySkeleton from '@/modules/lang-guess/components/game-history-skeleton';
import MyRequestsSkeleton from '@/modules/lang-requests/components/my-requests-skeleton';
import AccountDataSkeleton from '@/modules/user-profile/components/account-data-skeleton';

export default function AccountLoading() {
  return (
    <main className='mx-auto w-full max-w-6xl space-y-6 px-4 pt-2 pb-8'>
      {/* The title is one 60px line of dongle. */}
      <div className='flex h-15 items-center justify-center'>
        <Skeleton className='h-10 w-44 bg-background' />
      </div>
      <div className='grid gap-6 lg:grid-cols-2'>
        <div className='lg:col-start-1 lg:row-start-1'>
          <AccountDataSkeleton />
        </div>
        <div className='relative lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:min-h-144'>
          <GameHistorySkeleton className='max-h-[70dvh] lg:absolute lg:inset-0 lg:max-h-none' />
        </div>
        <div className='space-y-6 lg:col-start-1 lg:row-start-2'>
          <MyRequestsSkeleton />
          <MyRequestsSkeleton kind='language' />
        </div>
      </div>
    </main>
  );
}
