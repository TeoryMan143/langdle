import LoadingRegion from '@/core/components/main/loading-region';
import { Skeleton } from '@/core/components/ui/skeleton';

export default function AddPermissionLoading() {
  return (
    <LoadingRegion className='flex flex-col items-center justify-center gap-4 mt-5'>
      <div className='flex flex-col items-center'>
        {/* A `text-3xl` title (36px) over one line of text (24px). */}
        <div className='mb-2 flex h-9 items-center'>
          <Skeleton className='h-7 w-48 bg-background' />
        </div>
        <div className='flex h-6 items-center'>
          <Skeleton className='h-4 w-100 max-w-[90dvw] bg-background' />
        </div>
      </div>
      <Skeleton className='h-10 w-42 bg-background' />
    </LoadingRegion>
  );
}
