import { langCodeSchema } from '@/core/lib/schemas/langs';
import { langFlags } from '@/core/lib/utils';
import { getLanguage } from '@/core/actions/langs';
import LangFeaturesForm from '@/modules/lang-data/components/lang-features';
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

  const { name, exonym } = lang;

  return (
    <main className='space-y-4'>
      <h2 className='text-center text-2xl'>
        {langFlags[code]} {`${name}${exonym ? ` (${exonym})` : ''}`}
      </h2>
      <div className='flex justify-center'>
        <LangFeaturesForm code={code} currentData={lang} />
      </div>
    </main>
  );
}

export default EditDataPage;
