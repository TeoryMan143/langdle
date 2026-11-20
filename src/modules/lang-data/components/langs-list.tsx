import { getTranslations } from 'next-intl/server';
import {
  getLanguagesByIds,
  getLanguagesPage,
} from '@/modules/lang-data/actions';
import LangListItem from './lang-list-item';
import PagedLangsList from './paged-langs-list';

/** Rows per batch: they are light, so a screenful and then some. */
const PAGE_SIZE = 50;

/**
 * The languages a user may edit. Administrators may edit all of them, so they
 * get the whole catalogue, paged; editors get their few languages at once.
 */
async function LangsList({ allowedLangs }: { allowedLangs?: string[] }) {
  const t = await getTranslations('ListPage');

  if (!allowedLangs) {
    const pageRes = await getLanguagesPage({ limit: PAGE_SIZE });

    if (!pageRes.success) {
      console.error(pageRes.error);
      return <p className='text-xl text-center'>{t('noLanguages')}</p>;
    }

    return <PagedLangsList initialPage={pageRes.result} pageSize={PAGE_SIZE} />;
  }

  const langsRes = await getLanguagesByIds(allowedLangs);

  if (!langsRes.success) {
    console.error(langsRes.error);
    return <p className='text-xl text-center'>{t('noLanguages')}</p>;
  }

  return (
    <div className='bg-background rounded-base border-2 border-border overflow-clip mx-10 lg:mx-0'>
      {langsRes.result.map(language => (
        <LangListItem key={language.id} language={language} />
      ))}
    </div>
  );
}

export default LangsList;
