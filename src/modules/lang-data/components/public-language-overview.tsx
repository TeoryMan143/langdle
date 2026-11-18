import { getTranslations } from 'next-intl/server';
import { getLanguagesPage, getLanguagesSummary } from '../actions';
import PublicLanguageAtlas from './public-language-atlas';

/** Cards per batch: each one is heavy (a dialog per feature). */
const PAGE_SIZE = 24;

const COUNTERS = [
  'languages',
  'activeLanguages',
  'activeFeatures',
  'partialFeatures',
] as const;

/**
 * The data half of the public atlas: the catalogue counters and the first
 * batch of cards. It reads them itself, so the page can show its header while
 * they load (`PublicLanguageOverviewSkeleton`).
 */
async function PublicLanguageOverview() {
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
      <div className='mt-6 rounded-2xl border-2 border-border bg-background p-8 text-center shadow-shadow'>
        <p className='text-lg font-medium'>{t('loadError')}</p>
      </div>
    );
  }

  const summary = summaryRes.result;

  return (
    <>
      <section className='mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {COUNTERS.map(counter => (
          <div
            key={counter}
            className='rounded-2xl border-2 border-border bg-background p-4 shadow-shadow'
          >
            <p className='text-sm uppercase tracking-[0.2em] text-foreground/60'>
              {t(`summary.${counter}`)}
            </p>
            <p className='mt-2 text-3xl font-semibold'>{summary[counter]}</p>
          </div>
        ))}
      </section>

      <div className='mt-6'>
        <PublicLanguageAtlas
          initialPage={pageRes.result}
          pageSize={PAGE_SIZE}
        />
      </div>
    </>
  );
}

export default PublicLanguageOverview;
