import { getAllLanguages, getLanguagesByIds } from '@/core/actions/langs';
import { Link } from '@/i18n/navigation';
import LangImage from './lang-image';

async function LangsList({ allowedLangs }: { allowedLangs?: string[] }) {
  const langsRes = !allowedLangs
    ? await getAllLanguages()
    : await getLanguagesByIds(allowedLangs);

  if (!langsRes.success) {
    console.error(langsRes.error);
    return <p className='text-xl text-center'>No languages</p>;
  }

  const langs = langsRes.result;

  return (
    <div className='bg-background rounded-2xl border border-black overflow-clip'>
      {langs.map(({ id, name, exonym }) => (
        <Link
          href={`/data/${id}`}
          className='flex gap-2 justify-center items-center py-3 border-b border-black transition-colors px-4 hover:bg-main'
          key={id}
        >
          <LangImage code={id} />
          <p className='text-center text-xl'>{`${name}${exonym ? ` (${exonym})` : ''}`}</p>
        </Link>
      ))}
    </div>
  );
}

export default LangsList;
