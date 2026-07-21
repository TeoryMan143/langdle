import { ArrowRight, CalendarDays, Shuffle } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Ball from '@/core/components/icons/ball';
import Check from '@/core/components/icons/check';
import Xcancel from '@/core/components/icons/x';
import { Button } from '@/core/components/ui/button';
import type { LangFeatures } from '@/core/lib/types';
import { Link } from '@/i18n/navigation';
import Feature from '@/modules/lang-guess/components/feature';

const EXAMPLE_FEATURES: {
  id: LangFeatures;
  match: 'correct' | 'partial' | 'incorrect';
}[] = [
  { id: 'sov', match: 'correct' },
  { id: 'nounClasses', match: 'incorrect' },
  { id: 'tones', match: 'partial' },
  { id: 'caseMarking', match: 'correct' },
];

const FEATURE_CATEGORIES = [
  'wordOrder',
  'morphology',
  'phonology',
  'writingSystem',
] as const;

type StatusKey = 'present' | 'partial' | 'absent';

const STATUS_ICON = {
  present: Check,
  partial: Ball,
  absent: Xcancel,
} as const;

function StatusCard({
  title,
  copy,
  status,
}: {
  title: string;
  copy: string;
  status: StatusKey;
}) {
  const Icon = STATUS_ICON[status];
  const tone =
    status === 'present'
      ? 'text-emerald-700'
      : status === 'partial'
        ? 'text-amber-700'
        : 'text-slate-600';

  return (
    <article className='rounded-base border-2 border-border bg-secondary-background p-5 shadow-shadow'>
      <div className='flex items-center gap-3'>
        <span
          className={`flex size-9 items-center justify-center rounded-full border-2 border-border bg-white ${tone}`}
        >
          <Icon className='size-4' strokeWidth={2.5} />
        </span>
        <h3 className='text-xl font-heading text-foreground'>{title}</h3>
      </div>
      <p className='mt-4 text-sm leading-relaxed text-foreground/80'>{copy}</p>
    </article>
  );
}

function ModeCard({
  icon: Icon,
  eyebrow,
  title,
  copy,
  cta,
  href,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  eyebrow: string;
  title: string;
  copy: string;
  cta: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className='group flex h-full flex-col justify-between rounded-base border-2 border-border bg-main p-6 shadow-shadow transition-transform duration-200 hover:-translate-x-boxShadowX hover:-translate-y-boxShadowY hover:shadow-none'
    >
      <div>
        <div className='mb-4 inline-flex size-11 items-center justify-center rounded-full border-2 border-border bg-white'>
          <Icon className='size-5 text-foreground' strokeWidth={2.25} />
        </div>
        <p className='font-mono text-[11px] uppercase tracking-[0.2em] text-soft-det'>
          {eyebrow}
        </p>
        <h3 className='mt-2 text-2xl font-heading text-foreground'>{title}</h3>
        <p className='mt-3 text-sm leading-relaxed text-foreground/80'>
          {copy}
        </p>
      </div>
      <div className='mt-6 inline-flex items-center gap-2 text-sm font-medium text-foreground'>
        {cta}
        <ArrowRight className='size-4 transition-transform group-hover:translate-x-1' />
      </div>
    </Link>
  );
}

export default async function HowToPlayPage() {
  const t = await getTranslations('HowToPlayPage');

  return (
    <main className='mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8'>
      <div className='grid gap-6 lg:grid-cols-[1.15fr_0.85fr]'>
        <section className='rounded-base border-2 border-border bg-secondary-background p-6 shadow-shadow md:p-8'>
          <p className='font-mono text-[11px] uppercase tracking-[0.25em] text-soft-det'>
            {t('eyebrow')}
          </p>
          <h1 className='mt-3 max-w-2xl text-4xl font-heading leading-[1.05] text-foreground md:text-5xl'>
            {t('title')}
          </h1>
          <p className='mt-5 max-w-2xl text-base leading-relaxed text-foreground/80 md:text-lg'>
            {t('intro')}
          </p>

          <div className='mt-6 flex flex-wrap gap-3'>
            <Button asChild className='bg-white hover:bg-white/90'>
              <Link href='/'>{t('ctaDaily')}</Link>
            </Button>
            <Button asChild variant='neutral'>
              <Link href='/random'>{t('ctaRandom')}</Link>
            </Button>
          </div>

          <div className='mt-8 grid gap-4 sm:grid-cols-3'>
            <div className='rounded-base border-2 border-border bg-white p-4'>
              <p className='font-mono text-[11px] uppercase tracking-[0.2em] text-soft-det'>
                {t('quickStat.dailyLabel')}
              </p>
              <p className='mt-2 text-lg font-heading text-foreground'>
                {t('quickStat.dailyValue')}
              </p>
            </div>
            <div className='rounded-base border-2 border-border bg-white p-4'>
              <p className='font-mono text-[11px] uppercase tracking-[0.2em] text-soft-det'>
                {t('quickStat.guessesLabel')}
              </p>
              <p className='mt-2 text-lg font-heading text-foreground'>
                {t('quickStat.guessesValue')}
              </p>
            </div>
            <div className='rounded-base border-2 border-border bg-white p-4'>
              <p className='font-mono text-[11px] uppercase tracking-[0.2em] text-soft-det'>
                {t('quickStat.modesLabel')}
              </p>
              <p className='mt-2 text-lg font-heading text-foreground'>
                {t('quickStat.modesValue')}
              </p>
            </div>
          </div>
        </section>

        <aside className='rounded-base border-2 border-border bg-main p-6 shadow-shadow md:p-8'>
          <p className='font-mono text-[11px] uppercase tracking-[0.25em] text-soft-det'>
            {t('example.eyebrow')}
          </p>
          <h2 className='mt-3 text-2xl font-heading text-foreground'>
            {t('example.title')}
          </h2>
          <p className='mt-3 text-sm leading-relaxed text-foreground/80'>
            {t('example.copy')}
          </p>

          <div className='mt-5 grid gap-2'>
            {EXAMPLE_FEATURES.map(feature => (
              <Feature key={feature.id} id={feature.id} match={feature.match} />
            ))}
          </div>

          <div className='mt-5 rounded-base border-2 border-border bg-white px-4 py-3'>
            <p className='font-mono text-[11px] uppercase tracking-[0.2em] text-soft-det'>
              {t('example.attempt')}
            </p>
            <p className='mt-1 text-sm leading-relaxed text-foreground/80'>
              {t('example.note')}
            </p>
          </div>
        </aside>
      </div>

      <section className='mt-6 grid gap-4 md:grid-cols-3'>
        <StatusCard
          status='present'
          title={t('status.present.label')}
          copy={t('status.present.copy')}
        />
        <StatusCard
          status='partial'
          title={t('status.partial.label')}
          copy={t('status.partial.copy')}
        />
        <StatusCard
          status='absent'
          title={t('status.absent.label')}
          copy={t('status.absent.copy')}
        />
      </section>

      <section className='mt-6 rounded-base border-2 border-border bg-secondary-background p-6 shadow-shadow md:p-8'>
        <div className='flex flex-col gap-3 md:flex-row md:items-end md:justify-between'>
          <div>
            <p className='font-mono text-[11px] uppercase tracking-[0.25em] text-soft-det'>
              {t('modes.eyebrow')}
            </p>
            <h2 className='mt-2 text-3xl font-heading text-foreground'>
              {t('modes.title')}
            </h2>
          </div>
          <p className='max-w-xl text-sm leading-relaxed text-foreground/80'>
            {t('modes.copy')}
          </p>
        </div>

        <div className='mt-6 grid gap-4 lg:grid-cols-2'>
          <ModeCard
            icon={CalendarDays}
            eyebrow={t('modes.daily.eyebrow')}
            title={t('modes.daily.title')}
            copy={t('modes.daily.copy')}
            cta={t('modes.daily.cta')}
            href='/'
          />
          <ModeCard
            icon={Shuffle}
            eyebrow={t('modes.random.eyebrow')}
            title={t('modes.random.title')}
            copy={t('modes.random.copy')}
            cta={t('modes.random.cta')}
            href='/random'
          />
        </div>
      </section>

      <section className='mt-6 rounded-base border-2 border-border bg-white p-6 shadow-shadow md:p-8'>
        <p className='font-mono text-[11px] uppercase tracking-[0.25em] text-soft-det'>
          {t('features.eyebrow')}
        </p>
        <h2 className='mt-2 text-3xl font-heading text-foreground'>
          {t('features.title')}
        </h2>
        <p className='mt-3 max-w-3xl text-sm leading-relaxed text-foreground/80'>
          {t('features.copy')}
        </p>
        <div className='mt-5 flex flex-wrap gap-2'>
          {FEATURE_CATEGORIES.map(feature => (
            <span
              key={feature}
              className='rounded-full border-2 border-border bg-main px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground'
            >
              {t(`features.list.${feature}`)}
            </span>
          ))}
        </div>
      </section>

      <p className='mt-6 border-t-2 border-border pt-4 font-mono text-xs uppercase tracking-[0.2em] text-soft-det'>
        {t('footer')}
      </p>
    </main>
  );
}
