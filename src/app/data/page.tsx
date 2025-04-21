import { dongle } from '@/core/lib/fonts';
import LangsList from '@/modules/lang-data/components/langs-list';

function DataPage() {
  return (
    <main className='mt-5'>
      <h2 className={`${dongle.className} text-6xl mb-5`}>Languages list</h2>

      <LangsList />
    </main>
  );
}

export default DataPage;
