import LoadingRegion from '@/core/components/main/loading-region';
import { Skeleton } from '@/core/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/core/components/ui/table';

/**
 * A game on its way: the guess box, the attempts left (and the countdown of a
 * daily game) and the empty table of guesses, with the classes `Game` and
 * `GuessesTable` use, so nothing moves when the game replaces it. Each text
 * line is a box of that text's line height with a bar in it.
 */
function GameSkeleton({ daily = false }: { daily?: boolean }) {
  return (
    <LoadingRegion className='space-y-6 flex flex-col items-center w-full'>
      <div className='w-full md:h-14 md:w-[95%]'>
        <div className='h-full flex items-center gap-2'>
          <Skeleton className='h-10 flex-1 md:h-full' />
          <Skeleton className='h-10 w-19 md:h-full md:w-25' />
        </div>
      </div>
      <div className='flex h-6 items-center'>
        <Skeleton className='h-4 w-28 bg-background' />
      </div>
      {daily && (
        <div className='flex h-5 items-center'>
          <Skeleton className='h-3.5 w-46 bg-background' />
        </div>
      )}
      <Table>
        <TableHeader className='bg-main md:text-lg md:h-28'>
          <TableRow>
            <TableHead className='md:w-36 relative after:h-[80%] after:w-0.5 after:bg-soft-det after:absolute after:right-0 after:top-1/2 after:-translate-y-1/2'>
              <Skeleton className='mx-auto h-4 w-16 md:h-5 md:w-20' />
            </TableHead>
            <TableHead>
              <Skeleton className='mx-auto h-4 w-16 md:h-5 md:w-20' />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className='bg-background'>
          <TableRow>
            <TableCell />
            <TableCell>
              <div className='flex h-5 items-center justify-center'>
                <Skeleton className='h-3.5 w-32' />
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </LoadingRegion>
  );
}

export default GameSkeleton;
