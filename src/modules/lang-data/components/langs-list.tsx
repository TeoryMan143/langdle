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
  if (!allowedLangs) {
    const pageRes = await getLanguagesPage({ limit: PAGE_SIZE });

    if (!pageRes.success) {
      console.error(pageRes.error);
      return <p className='text-xl text-center'>No languages</p>;
    }

    return <PagedLangsList initialPage={pageRes.result} pageSize={PAGE_SIZE} />;
  }

  const langsRes = await getLanguagesByIds(allowedLangs);

  if (!langsRes.success) {
    console.error(langsRes.error);
    return <p className='text-xl text-center'>No languages</p>;
  }

  return (
    <div className='bg-background rounded-2xl border border-black overflow-clip mx-10 lg:mx-0'>
      {langsRes.result.map(language => (
        <LangListItem key={language.id} language={language} />
      ))}
    </div>
  );
}

export default LangsList;
