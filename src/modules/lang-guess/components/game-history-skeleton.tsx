import LoadingRegion from '@/core/components/main/loading-region';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/core/components/ui/card';
import { Skeleton } from '@/core/components/ui/skeleton';
import { cn } from '@/core/lib/utils';

const GAMES = 4;

/** The account's game history on its way; takes the same `className`. */
function GameHistorySkeleton({ className }: { className?: string }) {
  return (
    <LoadingRegion className={cn('flex flex-col', className)}>
      <Card className='min-h-0 flex-1'>
        <CardHeader className='border-b-2 border-border pb-(--card-spacing)'>
          <CardTitle className='flex items-center justify-between gap-2'>
            <Skeleton className='h-5 w-40' />
            <Skeleton className='h-6.5 w-9' />
          </CardTitle>
        </CardHeader>
        <CardContent className='flex-1 min-h-0 overflow-hidden space-y-3'>
          {Array.from({ length: GAMES }, (_, index) => (
            <div
              key={index}
              className='bg-secondary-background border-2 border-border rounded-base px-4 py-3 space-y-2'
            >
              <div className='flex h-5 items-center justify-between gap-2'>
                <Skeleton className='h-3.5 w-14 bg-background' />
                <Skeleton className='h-3.5 w-20 bg-background' />
              </div>
              <div className='flex h-7 items-center gap-2'>
                <Skeleton className='h-5 w-6 rounded-xs bg-background' />
                <Skeleton className='h-4.5 w-36 bg-background' />
              </div>
              <div className='flex gap-2'>
                <Skeleton className='h-6 w-24 bg-background' />
                <Skeleton className='h-6 w-20 bg-background' />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </LoadingRegion>
  );
}

export default GameHistorySkeleton;
