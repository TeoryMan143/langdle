'use client';

import { useTranslations } from 'next-intl';
import { dongle } from '@/core/lib/fonts';
import { cn } from '@/core/lib/utils';
import { Link } from '@/i18n/navigation';
import GitHub from '../icons/github';
import XLogo from '../icons/x-logo';
import { buttonVariants } from '../ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

const PORTFOLIO_URL = 'https://teoryman.cc';
const GITHUB_URL = 'https://github.com/TeoryMan143';
const X_URL = 'https://x.com/Teoryman143';

function ExternalLink({
  href,
  label,
  className,
  children,
}: {
  href: string;
  label: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <a
            href={href}
            target='_blank'
            rel='noopener noreferrer'
            aria-label={label}
            className={className}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Footer() {
  const t = useTranslations('Footer');

  return (
    <footer className='border-t-2 border-border bg-secondary-background'>
      <div className='mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6'>
        <div className='flex items-center gap-4'>
          <p
            className={`${dongle.className} relative top-1 text-4xl leading-none`}
          >
            LANGDLE
          </p>
          <Link
            href='/privacy'
            className='text-sm text-foreground/80 underline-offset-4 hover:text-foreground hover:underline'
          >
            {t('privacy')}
          </Link>
        </div>
        <TooltipProvider>
          <div className='flex items-center gap-3'>
            <span className='text-sm text-foreground/80'>{t('madeBy')}</span>
            <ExternalLink
              href={PORTFOLIO_URL}
              label={t('portfolio')}
              className={cn(
                buttonVariants({ size: 'icon' }),
                'font-heading text-base',
              )}
            >
              TM
            </ExternalLink>
            <ExternalLink
              href={GITHUB_URL}
              label={t('github')}
              className={cn(
                buttonVariants({ variant: 'neutral', size: 'icon' }),
                '[&_svg]:size-5',
              )}
            >
              <GitHub />
            </ExternalLink>
            <ExternalLink
              href={X_URL}
              label={t('x')}
              className={cn(
                buttonVariants({ variant: 'neutral', size: 'icon' }),
                '[&_svg]:size-4',
              )}
            >
              <XLogo />
            </ExternalLink>
          </div>
        </TooltipProvider>
      </div>
    </footer>
  );
}

export default Footer;
