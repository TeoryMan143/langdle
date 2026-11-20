import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { buttonVariants } from '@/core/components/ui/button';
import { Link } from '@/i18n/navigation';
import PublicLanguageOverview from '@/modules/lang-atlas/components/public-language-overview';
import PublicLanguageOverviewSkeleton from '@/modules/lang-atlas/components/public-language-overview-skeleton';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('PublicDataPage');

  return {
    title: t('title'),
    description: t('intro'),
    alternates: { canonical: '/data/public' },
    // The rest of `data/` is noindex; the public atlas is meant to be found.
    robots: { index: true, follow: true },
  };
}

async function PublicDataPage() {
  const t = await getTranslations('PublicDataPage');

  return (
    <main className='mx-auto max-w-6xl px-4 py-6'>
      <section className='relative overflow-hidden rounded-base border-2 border-border bg-background px-6 py-8 shadow-shadow sm:px-8'>
        <div className='absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(255,221,153,0.25),transparent_42%)]' />
        <div className='relative space-y-4'>
          <p className='text-sm uppercase tracking-[0.3em] text-foreground/70'>
            {t('eyebrow')}
          </p>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
            <div className='max-w-3xl space-y-3'>
              <h1 className='text-4xl font-heading sm:text-5xl'>
                {t('title')}
              </h1>
              <p className='max-w-2xl text-base leading-7 text-foreground/80 sm:text-lg'>
                {t('intro')}
              </p>
            </div>
            <Link className={buttonVariants()} href='/data/request-language'>
              {t('requestLanguage')}
            </Link>
          </div>
        </div>
      </section>

      <Suspense fallback={<PublicLanguageOverviewSkeleton />}>
        <PublicLanguageOverview />
      </Suspense>

      <p className='mt-8 text-center text-xs text-foreground/70'>
        {t('attribution')}
      </p>
    </main>
  );
}

export default PublicDataPage;
