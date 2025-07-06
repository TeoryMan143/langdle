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
    active: doc.value['$.active'] === '1',
  } as Language;
}

async function getById(id: string) {
  return { id, ...(await getObjectByKey('lang', id)) } as Language | undefined;
}

async function getAll(onlyActives = false) {
  const results = await client.ft.search(
    'idx:langs',
    onlyActives ? '@active:{true}' : '*',
    {
      RETURN: ['$.name', '$.exonym', '$.features', '$.active'],
      LIMIT: {
        from: 0,
        size: 50,
      },
    },
  );

  const langs = results.documents.map(docToLanguage);

  return langs;
}

async function set(id: string, data: LanguageData) {
  const res = await setObjectToKey('lang', id, data);
  return res === 'OK';
}

async function setStatus(id: string, value: boolean) {
  const res = await client.json.set(`lang:${id}`, '$.active', value);
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

  const resultsEx = await client.ft.search(
    'idx:langs',
    `(@exonym:${safeQ}*) @active:{true}`,
    {
      RETURN: ['$.name', '$.exonym', '$.features', '$.active'],
      LIMIT: {
        from: 0,
        size: 50,
      },
    },
  );

  const resultsNm = await client.ft.search(
    'idx:langs',
    `(@name:${safeQ}*) @active:{true}`,
    {
      RETURN: ['$.name', '$.exonym', '$.features', '$.active'],
      LIMIT: {
        from: 0,
        size: 50,
      },
    },
  );

  const langsEx = resultsEx.documents.map(docToLanguage);

  const langsNm = resultsNm.documents.map(docToLanguage);

  const exCodes = langsEx.map(l => l.id);

  langsEx.push(...langsNm.filter(l => !exCodes.includes(l.id)));

  return langsEx;
}

export default { getAll, getById, set, setStatus, getByIds, getFuzzy };
