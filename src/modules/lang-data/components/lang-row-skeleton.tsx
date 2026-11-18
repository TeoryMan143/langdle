import { Skeleton } from '@/core/components/ui/skeleton';
import { cn } from '@/core/lib/utils';

/** Name widths, cycled so a column of rows does not look stamped out. */
const NAME_WIDTHS = ['w-32', 'w-44', 'w-24', 'w-36', 'w-28'];

/** A flag and a name on their way: one row of a languages list or picker. */
function LangRowSkeleton({
  index = 0,
  className,
}: {
  /** The row's position, which picks the width of its name. */
  index?: number;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Skeleton className='h-5 w-6 shrink-0 rounded-xs' />
      <Skeleton
        className={cn('h-4', NAME_WIDTHS[index % NAME_WIDTHS.length])}
      />
    </div>
  );
}

export default LangRowSkeleton;
