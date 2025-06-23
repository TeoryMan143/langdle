import { client } from '@/core/database/redis/config';
import {
  getObjectByKey,
  setObjectToKey,
} from '@/core/database/redis/key-getters';
import type { Language, LanguageData } from '@/core/lib/types';

interface SearchDocumentValue {
  [key: string]:
    | string
    | number
    | null
    | Array<SearchDocumentValue>
    | SearchDocumentValue;
}

type Doc = {
  id: string;
  value: SearchDocumentValue;
};

function docToLanguage(doc: Doc) {
  return {
    id: doc.id.slice(5),
    name: doc.value['$.name'],
    exonym: doc.value['$.exonym'],
    features: JSON.parse((doc.value['$.features'] as string) ?? '[]'),
    active: doc.value['$.active'] ?? false,
  } as Language;
}

async function getById(id: string) {
  return (await getObjectByKey('lang', id)) as LanguageData | undefined;
}

async function getAll() {
  const results = await client.ft.search('idx:langs', '*', {
    RETURN: ['$.name', '$.exonym', '$.features', '$.active'],
    LIMIT: {
      from: 0,
      size: 50,
    },
  });

  const langs = results.documents.map(docToLanguage) as Language[];

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

async function getFuzzy(q: string) {
  const safeQ = q.replace(/["]/g, '');

  const resultsEx = await client.ft.search('idx:langs', `(@exonym:${safeQ}*)`, {
    RETURN: ['$.name', '$.exonym', '$.features', '$.active'],
    LIMIT: {
      from: 0,
      size: 50,
    },
  });

  const resultsNm = await client.ft.search('idx:langs', `(@name:${safeQ}*)`, {
    RETURN: ['$.name', '$.exonym', '$.features', '$.active'],
    LIMIT: {
      from: 0,
      size: 50,
    },
  });

  const langsEx = resultsEx.documents.map(docToLanguage);

  const langsNm = resultsNm.documents.map(docToLanguage);

  const exCodes = langsEx.map(l => l.id);

  langsEx.push(...langsNm.filter(l => !exCodes.includes(l.id)));

  return langsEx;
}

export default { getAll, getById, set, getByIds, getFuzzy };
