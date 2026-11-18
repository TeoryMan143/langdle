import LoadingRegion from '@/core/components/main/loading-region';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/core/components/ui/card';
import { Skeleton } from '@/core/components/ui/skeleton';
import RequestCardSkeleton from './request-card-skeleton';

/**
 * The account's card of change or language requests on its way; the
 * language one has a button in its header.
 */
function MyRequestsSkeleton({
  kind = 'change',
}: {
  kind?: 'change' | 'language';
}) {
  const action = kind === 'language';

  return (
    <LoadingRegion>
      <Card>
        <CardHeader className={action ? 'items-center' : undefined}>
          <CardTitle className='flex h-6 items-center'>
            <Skeleton className='h-5 w-52' />
          </CardTitle>
          {action && (
            <CardAction className='row-span-1 self-center'>
              <Skeleton className='h-9 w-36' />
            </CardAction>
          )}
        </CardHeader>
        <CardContent className='space-y-4'>
          <RequestCardSkeleton kind={kind} />
        </CardContent>
      </Card>
    </LoadingRegion>
  );
}

export default MyRequestsSkeleton;
