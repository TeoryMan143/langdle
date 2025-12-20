import { getTranslations } from 'next-intl/server';
import { getLanguage } from '@/core/actions/langs';
import LangImage from '@/modules/lang-data/components/lang-image';
import { getGameHistory } from '../actions';

async function GameHistory() {
  const historyRes = await getGameHistory();

  if (!historyRes.success) {
    return <p className='text-red'>Internal error</p>;
  }

  const history = historyRes.result;

  const ex = await getTranslations('Exonyms');

  return (
    <div className='p-5 bg-background border-2 rounded-base space-y-3 flex flex-col flex-1 max-h-[50dvh] min-h-0'>
      <h4 className='text-2xl font-bold text-center'>Game History</h4>
      <div className='overflow-y-auto space-y-3 flex-1 min-h-0'>
        {history.length === 0 && <p>No data</p>}
        {history.map(
          async ({ id, date, guessed, guesses, targetLang, type }) => {
            const langRes = await getLanguage(targetLang);

            if (!langRes.success) {
              return <p>error loading language</p>;
            }

            const lang = langRes.result;

            return (
              <div
                key={id}
                className='bg-white border-2 rounded-base px-3 py-2 flex flex-col gap-1'
              >
                <div>
                  <h5 className='text-center text-xl'>{date}</h5>
                </div>
                <div className='grid grid-cols-4 text-center justify-evenly'>
                  <div className='space-y-1'>
                    <p>
                      <strong>Game type</strong>
                    </p>
                    <p>{type}</p>
                  </div>
                  <div className='space-y-1'>
                    <p>
                      <strong>Target</strong>
                    </p>
                    <div>
                      <LangImage code={targetLang} /> {lang.name} (
                      {ex(targetLang)})
                    </div>
                  </div>
                  <div className='space-y-1'>
                    <p>
                      <strong>Guessed</strong>
                    </p>
                    <p className='font-bold'>
                      {guessed ? (
                        <span className='text-green-500'>Yes</span>
                      ) : (
                        <span className='text-red-500'>No</span>
                      )}
                    </p>
                  </div>
                  <div className='space-y-1'>
                    <p>
                      <strong>Guesses</strong>
                    </p>
                    <p>{guesses}</p>
                  </div>
                </div>
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}

export default GameHistory;
