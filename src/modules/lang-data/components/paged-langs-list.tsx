'use client';

import { useTranslations } from 'next-intl';
import { useLangPages } from '../hooks/use-lang-pages';
import type { LanguagePage } from '../types';
import LangListItem from './lang-list-item';
import LoadMore from './load-more';

type Props = {
  /** The first batch, read by the server; the next ones have its size. */
  initialPage: LanguagePage;
  pageSize: number;
};

/** Every language, for administrators, loaded batch by batch as they scroll. */
function PagedLangsList({ initialPage, pageSize }: Props) {
  const t = useTranslations('ListPage');
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useLangPages(
    { limit: pageSize, initialPage },
  );

  const languages = data?.pages.flatMap(page => page.items) ?? [];

  return (
    <div className='flex w-full flex-col items-center gap-4'>
      <div className='bg-background rounded-2xl border border-black overflow-clip mx-10 lg:mx-0'>
        {languages.map(language => (
          <LangListItem key={language.id} language={language} />
        ))}
      </div>
      <LoadMore
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
        label={t('showMore')}
      />
    </div>
  );
}

export default PagedLangsList;
