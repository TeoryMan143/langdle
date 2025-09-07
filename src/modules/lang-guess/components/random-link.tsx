'use client';

import Random from '@/core/components/icons/random';
import { Button } from '@/core/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/core/components/ui/tooltip';
import { usePathname, useRouter } from '@/i18n/navigation';

function RandomLink() {
  const router = useRouter();
  const path = usePathname();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipContent>
          <p className='text-2xl'>Guess random</p>
        </TooltipContent>
        <TooltipTrigger
          className='absolute top-1/2 -translate-y-1/2 -right-20'
          asChild
        >
          <Button
            onClick={() => {
              if (path !== '/random') {
                router.push('/random');
              } else {
                window.location.reload();
              }
            }}
            variant='noShadow'
          >
            <Random />
          </Button>
        </TooltipTrigger>
      </Tooltip>
    </TooltipProvider>
  );
}

export default RandomLink;
