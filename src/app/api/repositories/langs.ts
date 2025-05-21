import {
  getObjectByKey,
  setObjectToKey,
} from '@/core/database/redis/key-getters';
import type { Language, LanguageData } from '@/core/lib/types';
import { client } from '@/core/database/redis/config';

async function getById(id: string) {
  return (await getObjectByKey('lang', id)) as LanguageData | undefined;
}

async function getAll() {
  const results = await client.ft.search('idx:langs', '*', {
    RETURN: ['$.name', '$.exonym', '$.features'],
  });

  const langs = results.documents.map(doc => ({
    id: doc.id.slice(5),
    name: doc.value['$.name'],
    exonym: doc.value['$.exonym'],
    features: JSON.parse((doc.value['$.features'] as string) ?? '[]'),
  })) as Language[];

  return langs;
}

async function set(id: string, data: LanguageData) {
  const res = await setObjectToKey('lang', id, data);
  return res === 'OK';
}

export default { getAll, getById, set };
