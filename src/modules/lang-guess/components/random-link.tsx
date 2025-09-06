'use client';

import Random from '@/core/components/icons/random';
import { Button } from '@/core/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/core/components/ui/tooltip';
import { Link } from '@/i18n/navigation';

function RandomLink() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipContent>
          <p className='text-2xl'>Guess random</p>
        </TooltipContent>
        <TooltipTrigger className='absolute top-1/2 -translate-y-1/2 -right-20'>
          <Button variant='noShadow' asChild>
            <Link href='/random'>
              <Random />
            </Link>
          </Button>
        </TooltipTrigger>
      </Tooltip>
    </TooltipProvider>
  );
}

export default RandomLink;
