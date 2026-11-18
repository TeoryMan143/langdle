'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/core/lib/utils';

/**
 * The wrapper of every skeleton: the blocks inside have no text, so this is
 * what tells assistive technology that the content is on its way.
 */
function LoadingRegion({ className, children }: React.ComponentProps<'div'>) {
  const t = useTranslations('Nav');

  return (
    <div role='status' aria-busy='true' className={cn(className)}>
      <span className='sr-only'>{t('loading')}</span>
      {children}
    </div>
  );
}

export default LoadingRegion;
