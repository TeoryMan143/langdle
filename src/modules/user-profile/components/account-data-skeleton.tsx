import LoadingRegion from '@/core/components/main/loading-region';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/core/components/ui/card';
import { Skeleton } from '@/core/components/ui/skeleton';

/**
 * The profile card of the account page on its way: the name and email, the
 * native language row, one fluent language row with the add button under it,
 * and the account's buttons.
 */
function AccountDataSkeleton() {
  return (
    <LoadingRegion>
      <Card>
        <CardHeader className='border-b-2 border-border pb-(--card-spacing)'>
          <CardTitle className='flex h-[1.875rem] items-center gap-3 text-3xl'>
            <Skeleton className='h-7 aspect-3/2' />
            <Skeleton className='h-7 w-40' />
          </CardTitle>
          <CardDescription className='flex h-5 items-center'>
            <Skeleton className='h-3.5 w-56' />
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-5'>
          <section className='space-y-2'>
            <LabelLine />
            <LanguageRow />
          </section>
          <section className='space-y-2'>
            <LabelLine />
            <LanguageRow />
            <Skeleton className='h-10 w-full' />
          </section>
        </CardContent>
        <CardFooter className='border-t-2 border-border pt-(--card-spacing) justify-end gap-3'>
          <Skeleton className='h-10 w-20' />
          <Skeleton className='h-10 w-28' />
        </CardFooter>
      </Card>
    </LoadingRegion>
  );
}

function LabelLine() {
  return (
    <div className='flex h-5 items-center'>
      <Skeleton className='h-3.5 w-28' />
    </div>
  );
}

/** A language row: the flag and name, and its icon button. */
function LanguageRow() {
  return (
    <div className='flex items-center gap-3 rounded-base border-2 border-border bg-secondary-background py-1.5 pr-1.5 pl-3'>
      <Skeleton className='h-5 w-6 rounded-xs bg-background' />
      <Skeleton className='h-4 w-40 bg-background' />
      <Skeleton className='ml-auto size-9 bg-background' />
    </div>
  );
}

export default AccountDataSkeleton;
