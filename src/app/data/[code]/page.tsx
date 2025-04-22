import { langCodeSchema } from '@/core/lib/schemas/langs';
import { langFlags } from '@/core/lib/utils';
import { getLanguage } from '@/modules/lang-data/actions';
import { notFound } from 'next/navigation';

type Props = {
  params: Promise<{ code: string }>;
};

async function EditDataPage({ params }: Props) {
  const { code: unvCode } = await params;

  const { error: valError, data: code } = langCodeSchema.safeParse(unvCode);

  if (valError) {
    notFound();
  }

  const { success, result: lang, error } = await getLanguage(code);

  if (!success) {
    console.error(error);
    notFound();
  }

  const { name, exonym, features } = lang;

  return (
    <main className='space-y-4'>
      <h2>
        {langFlags[code]} {`${name}${exonym ? ` (${exonym})` : ''}`}
      </h2>
    </main>
  );
}

export default EditDataPage;
