import { getAllLanguages, getLanguagesByIds } from '@/core/actions/langs';
import { Link } from '@/i18n/navigation';

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

function LangSelector({
  code,
  name,
  exonym,
}: { code: string; name: string; exonym?: string }) {
  return (
    <Link
      href={`/data/${code}`}
      className='py-3 border-b border-black block transition-colors px-4 hover:bg-main'
    >
      <p className='text-center text-xl'>{`${'🇺🇸'} ${name}${exonym ? ` (${exonym})` : ''}`}</p>
    </Link>
  );
}

export default LangsList;
