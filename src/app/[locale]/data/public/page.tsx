import { getTranslations } from 'next-intl/server';
import { getAllLanguages } from '@/core/actions/langs';
import PublicLanguageAtlas from '@/modules/lang-data/components/public-language-atlas';

async function PublicDataPage() {
  const t = await getTranslations('PublicDataPage');
  const languagesRes = await getAllLanguages();

  if (!languagesRes.success) {
    console.error(languagesRes.error);

    return (
      <main className='mx-auto flex min-h-[60dvh] max-w-6xl items-center justify-center px-4'>
        <div className='max-w-xl rounded-4xl border-2 border-border bg-background p-8 text-center shadow-shadow'>
          <h1 className='text-3xl font-semibold'>{t('title')}</h1>
          <p className='mt-4 text-base text-foreground/80'>{t('loadError')}</p>
        </div>
      </main>
    );
  }

  const languages = languagesRes.result;

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
          </div>
        </div>
      </section>

      <section className='mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <div className='rounded-2xl border-2 border-border bg-background p-4 shadow-shadow'>
          <p className='text-sm uppercase tracking-[0.2em] text-foreground/60'>
            {t('summary.languages')}
          </p>
          <p className='mt-2 text-3xl font-semibold'>{languages.length}</p>
        </div>
        <div className='rounded-2xl border-2 border-border bg-background p-4 shadow-shadow'>
          <p className='text-sm uppercase tracking-[0.2em] text-foreground/60'>
            {t('summary.activeLanguages')}
          </p>
          <p className='mt-2 text-3xl font-semibold'>
            {languages.filter(language => language.active).length}
          </p>
        </div>
        <div className='rounded-2xl border-2 border-border bg-background p-4 shadow-shadow'>
          <p className='text-sm uppercase tracking-[0.2em] text-foreground/60'>
            {t('summary.activeFeatures')}
          </p>
          <p className='mt-2 text-3xl font-semibold'>
            {languages.reduce(
              (total, language) => total + language.features.length,
              0,
            )}
          </p>
        </div>
        <div className='rounded-2xl border-2 border-border bg-background p-4 shadow-shadow'>
          <p className='text-sm uppercase tracking-[0.2em] text-foreground/60'>
            {t('summary.partialFeatures')}
          </p>
          <p className='mt-2 text-3xl font-semibold'>
            {languages.reduce(
              (total, language) => total + language.partial.length,
              0,
            )}
          </p>
        </div>
      </section>

      <div className='mt-6'>
        <PublicLanguageAtlas languages={languages} />
      </div>
    </main>
  );
}

export default PublicDataPage;
