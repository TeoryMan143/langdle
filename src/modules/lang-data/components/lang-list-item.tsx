import type { Language } from '@/core/types';
import { Link } from '@/i18n/navigation';
import LangImage from './lang-image';

/** One row of the languages list: the flag and name, linking to its editor. */
function LangListItem({
  language: { id, name, exonym },
}: {
  language: Pick<Language, 'id' | 'name' | 'exonym'>;
}) {
  return (
    <Link
      href={`/data/${id}`}
      className='flex gap-2 justify-center items-center py-3 border-b border-black transition-colors px-4 hover:bg-main'
    >
      <LangImage code={id} />
      <p className='text-center text-xl'>{`${name}${exonym ? ` (${exonym})` : ''}`}</p>
    </Link>
  );
}

export default LangListItem;
