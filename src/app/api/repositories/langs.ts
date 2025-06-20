import { client } from '@/core/database/redis/config';
import {
  getObjectByKey,
  setObjectToKey,
} from '@/core/database/redis/key-getters';
import type { Language, LanguageData } from '@/core/lib/types';

async function getById(id: string) {
  return (await getObjectByKey('lang', id)) as LanguageData | undefined;
}

async function getAll() {
  const results = await client.ft.search('idx:langs', '*', {
    RETURN: ['$.name', '$.exonym', '$.features', '$.active'],
  });

  const langs = results.documents.map(doc => ({
    id: doc.id.slice(5),
    name: doc.value['$.name'],
    exonym: doc.value['$.exonym'],
    features: JSON.parse((doc.value['$.features'] as string) ?? '[]'),
    active: doc.value['$.active'] ?? false,
  })) as Language[];

  return langs;
}

async function set(id: string, data: LanguageData) {
  const res = await setObjectToKey('lang', id, data);
  return res === 'OK';
}

async function getByIds(ids: string[]): Promise<Language[]> {
  const langsData = (await Promise.all(
    ids.map(id => client.json.get(`lang:${id}`)),
  )) as LanguageData[];

  const langs = langsData.map((data, i) => ({ id: ids[i], ...data }));

  return langs;
}

export default { getAll, getById, set, getByIds };
