import { Skeleton } from '@/core/components/ui/skeleton';
import { groupedLangFeatures } from '@/core/lib/features';

/**
 * A chip's width from its feature's id, which has about as many letters as
 * its name (`clickConsonants`, "Click consonants"): the `px-3` padding plus
 * the average width of an `text-xs` letter.
 */
const chipWidth = (feature: string) => `${24 + feature.length * 5.9}px`;

/**
 * A card of the public atlas on its way. It draws a chip per feature of the
 * catalogue, like the real card, so it takes the same room.
 */
function LanguageCardSkeleton() {
  return (
    <article className='rounded-[1.75rem] border-2 border-border bg-background p-5 shadow-shadow'>
      <header className='flex flex-col gap-4 md:gap-10 sm:flex-row sm:items-start sm:justify-between'>
        <div className='flex items-start gap-4'>
          <Skeleton className='mt-1 h-8 w-11 shrink-0 rounded-sm' />
          <div>
            <div className='flex h-8 items-center'>
              <Skeleton className='h-6 w-40' />
            </div>
            <div className='mt-1 flex h-5 items-center'>
              <Skeleton className='h-3.5 w-24' />
            </div>
          </div>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Skeleton className='h-7.5 w-18 rounded-full' />
          <Skeleton className='h-7.5 w-30 rounded-full' />
          <Skeleton className='h-7.5 w-30 rounded-full' />
        </div>
      </header>

      <div className='mt-5 grid gap-4'>
        {Object.entries(groupedLangFeatures).map(([group, features]) => (
          <section
            key={group}
            className='rounded-2xl border border-border/70 p-4'
          >
            <div className='flex h-6 items-center'>
              <Skeleton className='h-4 w-28' />
            </div>
            <div className='mt-3 flex flex-wrap gap-2'>
              {features.map(feature => (
                <Skeleton
                  key={feature}
                  className='h-6.5 rounded-full'
                  style={{ width: chipWidth(feature) }}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}

export default LanguageCardSkeleton;
