'use client';

import { useEffect } from 'react';
import { useIntersectionObserver } from 'usehooks-ts';
import Loading from '@/core/components/icons/loading';
import { Button } from '@/core/components/ui/button';

type Props = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  label: string;
};

/**
 * The end of a paged list: asks for the next batch as it scrolls near the
 * viewport, with a button for keyboards and for when the observer cannot fire.
 */
function LoadMore({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  label,
}: Props) {
  const { ref, isIntersecting } = useIntersectionObserver({
    rootMargin: '600px 0px',
  });

  // Runs again once a batch lands, so a sentinel still in view keeps loading.
  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      onLoadMore();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, onLoadMore]);

  if (!hasNextPage) {
    return null;
  }

  return (
    <div ref={ref} className='flex justify-center'>
      <Button
        variant='neutral'
        disabled={isFetchingNextPage}
        onClick={onLoadMore}
      >
        {isFetchingNextPage && <Loading className='size-5' />}
        {label}
      </Button>
    </div>
  );
}

export default LoadMore;
