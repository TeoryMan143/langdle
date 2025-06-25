import { lt } from 'drizzle-orm';
import cron from 'node-cron';
import langRepository from '@/app/api/repositories/langs';
import { setStringToKey } from '../database/redis/key-getters';
import { db } from '../database/relational/config';
import { langTokenTable } from '../database/relational/tables';

export function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function jobs() {
  cron.schedule('*/15 * * * *', async () => {
    try {
      await db
        .delete(langTokenTable)
        .where(lt(langTokenTable.expiresAt, new Date()));
      console.log('Expired language tokens deleted successfully');
    } catch (e) {
      console.error(e);
    }
  });

  cron.schedule(
    '0 0 * * *',
    async () => {
      try {
        const langs = await langRepository.getAll();

        const dayLang = langs[getRandomInt(0, langs.length - 1)];

        await setStringToKey('daylang', dayLang.id);
      } catch (e) {
        console.error(e);
      }
    },
    {
      timezone: 'UTC',
    },
  );
}
