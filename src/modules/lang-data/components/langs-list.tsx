import { getAllLanguages, getLanguagesByIds } from '@/core/actions/langs';
import LangSelector from './lang-selector';

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
        <LangSelector key={id} code={id} name={name} exonym={exonym} />
      ))}
    </div>
  );
}

export default LangsList;
