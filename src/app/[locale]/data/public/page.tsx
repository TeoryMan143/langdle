import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { buttonVariants } from '@/core/components/ui/button';
import { Link } from '@/i18n/navigation';
import {
  getLanguagesPage,
  getLanguagesSummary,
} from '@/modules/lang-data/actions';
import PublicLanguageAtlas from '@/modules/lang-data/components/public-language-atlas';

/** Cards per batch: each one is heavy (a dialog per feature). */
const PAGE_SIZE = 24;

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
  const [pageRes, summaryRes] = await Promise.all([
    getLanguagesPage({ limit: PAGE_SIZE }),
    getLanguagesSummary(),
  ]);

  if (!pageRes.success || !summaryRes.success) {
    console.error(
      pageRes.success ? undefined : pageRes.error,
      summaryRes.success ? undefined : summaryRes.error,
    );

    return (
      <main className='mx-auto flex min-h-[60dvh] max-w-6xl items-center justify-center px-4'>
        <div className='max-w-xl rounded-4xl border-2 border-border bg-background p-8 text-center shadow-shadow'>
          <h1 className='text-3xl font-semibold'>{t('title')}</h1>
          <p className='mt-4 text-base text-foreground/80'>{t('loadError')}</p>
        </div>
      </main>
    );
  }

  const summary = summaryRes.result;

  return (
    <main className='mx-auto max-w-6xl px-4 py-6'>
      <section className='relative overflow-hidden rounded-4xl border-2 border-border bg-background px-6 py-8 shadow-shadow sm:px-8'>
        <div className='absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(255,221,153,0.25),transparent_42%)]' />
        <div className='relative space-y-4'>
          <p className='text-sm uppercase tracking-[0.3em] text-foreground/70'>
            {t('eyebrow')}
          </p>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
            <div className='max-w-3xl space-y-3'>
              <h1 className='text-4xl font-semibold sm:text-5xl'>
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

      <section className='mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <div className='rounded-2xl border-2 border-border bg-background p-4 shadow-shadow'>
          <p className='text-sm uppercase tracking-[0.2em] text-foreground/60'>
            {t('summary.languages')}
          </p>
          <p className='mt-2 text-3xl font-semibold'>{summary.languages}</p>
        </div>
        <div className='rounded-2xl border-2 border-border bg-background p-4 shadow-shadow'>
          <p className='text-sm uppercase tracking-[0.2em] text-foreground/60'>
            {t('summary.activeLanguages')}
          </p>
          <p className='mt-2 text-3xl font-semibold'>
            {summary.activeLanguages}
          </p>
        </div>
        <div className='rounded-2xl border-2 border-border bg-background p-4 shadow-shadow'>
          <p className='text-sm uppercase tracking-[0.2em] text-foreground/60'>
            {t('summary.activeFeatures')}
          </p>
          <p className='mt-2 text-3xl font-semibold'>
            {summary.activeFeatures}
          </p>
        </div>
        <div className='rounded-2xl border-2 border-border bg-background p-4 shadow-shadow'>
          <p className='text-sm uppercase tracking-[0.2em] text-foreground/60'>
            {t('summary.partialFeatures')}
          </p>
          <p className='mt-2 text-3xl font-semibold'>
            {summary.partialFeatures}
          </p>
        </div>
      </section>

      <div className='mt-6'>
        <PublicLanguageAtlas
          initialPage={pageRes.result}
          pageSize={PAGE_SIZE}
        />
      </div>

      <p className='mt-8 text-center text-xs text-foreground/70'>
        {t('attribution')}
      </p>
    </main>
  );
}

export default PublicDataPage;
