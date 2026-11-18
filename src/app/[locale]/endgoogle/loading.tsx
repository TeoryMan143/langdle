import LoadingRegion from '@/core/components/main/loading-region';
import { Skeleton } from '@/core/components/ui/skeleton';

export default function EndGoogleLoading() {
  return (
    <LoadingRegion className='flex flex-col items-center gap-5'>
      {/* The title is one `text-3xl` line: 36px. */}
      <div className='flex h-9 items-center'>
        <Skeleton className='h-7 w-70 bg-background' />
      </div>
      {/* `GoogleDataForm`: the nickname, the country picker, the button. */}
      <div className='flex flex-col items-center'>
        <div className='flex w-[300px] max-w-[90dvw] flex-col gap-3'>
          <Skeleton className='h-10 w-full' />
          <Skeleton className='mt-1 h-9.5 w-full' />
        </div>
        <Skeleton className='mt-5 h-10 w-34 bg-background' />
      </div>
    </LoadingRegion>
  );
}
