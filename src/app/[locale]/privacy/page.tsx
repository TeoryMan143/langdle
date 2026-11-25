import type { Metadata } from 'next';
import { getFormatter, getTranslations } from 'next-intl/server';
import { buttonVariants } from '@/core/components/ui/button';

/** Where privacy requests go. */
const PRIVACY_EMAIL = 'jonathancortestm143@gmail.com';

/** Bump it with any change to what the policy says. */
const UPDATED = new Date('2026-11-25T00:00:00Z');

/**
 * The order of each section's messages: a string is a paragraph, an array a
 * bullet list.
 */
const SECTIONS = {
  who: ['p1'],
  account: ['p1', ['i1', 'i2', 'i3', 'i4', 'i5', 'i6'], 'p2'],
  logs: ['p1', ['i1', 'i2', 'i3', 'i4', 'i5', 'i6'], 'p2'],
  storage: ['p1', ['i1', 'i2', 'i3', 'i4'], 'p2'],
  purposes: [['i1', 'i2', 'i3', 'i4']],
  sharing: ['p1', ['i1', 'i2', 'i3', 'i4', 'i5', 'i6'], 'p2'],
  retention: [['i1', 'i2', 'i3']],
  rights: ['p1', ['i1', 'i2', 'i3'], 'p2'],
  children: ['p1'],
  changes: ['p1'],
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('PrivacyPage');

  return {
    title: t('title'),
    description: t('description'),
    alternates: { canonical: '/privacy' },
  };
}

export default async function PrivacyPage() {
  const t = await getTranslations('PrivacyPage');
  const format = await getFormatter();
  const email = PRIVACY_EMAIL;

  return (
    <main className='mx-auto w-full max-w-3xl px-4 py-6 md:px-6 md:py-8'>
      <section className='rounded-base border-2 border-border bg-secondary-background p-6 shadow-shadow md:p-8'>
        <p className='font-mono text-[11px] uppercase tracking-[0.25em] text-soft-det'>
          {t('eyebrow')}
        </p>
        <h1 className='mt-3 text-4xl font-heading leading-[1.05] text-foreground md:text-5xl'>
          {t('title')}
        </h1>
        <p className='mt-3 text-sm text-foreground/70'>
          {t('updated', {
            date: format.dateTime(UPDATED, {
              dateStyle: 'long',
              timeZone: 'UTC',
            }),
          })}
        </p>
        <p className='mt-5 text-base leading-relaxed text-foreground/80'>
          {t('intro')}
        </p>
      </section>

      {Object.entries(SECTIONS).map(([section, blocks]) => (
        <section
          key={section}
          className='mt-6 rounded-base border-2 border-border bg-white p-6 md:p-8'
        >
          <h2 className='text-2xl font-heading text-foreground'>
            {t(`sections.${section}.title`)}
          </h2>
          {blocks.map(block =>
            typeof block === 'string' ? (
              <p
                key={block}
                className='mt-3 text-sm leading-relaxed text-foreground/80'
              >
                {t(`sections.${section}.${block}`, { email })}
              </p>
            ) : (
              <ul
                key={block.join()}
                className='mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground/80'
              >
                {block.map(item => (
                  <li key={item}>{t(`sections.${section}.${item}`)}</li>
                ))}
              </ul>
            ),
          )}
        </section>
      ))}

      <div className='mt-6 flex justify-center'>
        <a className={buttonVariants()} href={`mailto:${email}`}>
          {t('contact')}
        </a>
      </div>
    </main>
  );
}
