'use client';

import { useTranslations } from 'next-intl';
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
  const t = useTranslations('Game');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipContent>
          <p className='text-lg'>{t('guessRandom')}</p>
        </TooltipContent>
        <TooltipTrigger asChild>
          <Button
            onClick={() => {
              if (path !== '/random') {
                router.push('/random');
              } else {
                window.location.reload();
              }
            }}
            variant='noShadow'
            className='text-xs md:text-base'
          >
            <Random />
          </Button>
        </TooltipTrigger>
      </Tooltip>
    </TooltipProvider>
  );
}

export default RandomLink;
