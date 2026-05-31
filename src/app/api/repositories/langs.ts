import { getClient } from '@/core/database/redis/config';
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

function docToLanguage(doc: Doc): Language {
  return {
    id: doc.id.slice(5),
    name: doc.value['$.name'] as string,
    exonym: doc.value['$.exonym'] as string,
    features: JSON.parse((doc.value['$.features'] as string) ?? '[]'),
    active: doc.value['$.active'] === '1',
    partial: JSON.parse((doc.value['$.partial'] as string) ?? '[]'),
    searchParams: JSON.parse((doc.value['$.searchParams'] as string) ?? '[]'),
  };
}

async function getById(id: string) {
  return { id, ...(await getObjectByKey('lang', id)) } as Language | undefined;
}

async function getAll(onlyActives = false) {
  const client = await getClient();
  const results = await client.ft.search(
    'idx:langs',
    onlyActives ? '@active:{true}' : '*',
    {
      RETURN: [
        '$.name',
        '$.exonym',
        '$.features',
        '$.active',
        '$.partial',
        '$.searchParams',
      ],
      LIMIT: {
        from: 0,
        size: 50,
      },
    },
  );

  const langs = results.documents.map(docToLanguage);

  return langs.sort((a, b) => {
    return a.name.toLocaleLowerCase().localeCompare(b.name.toLocaleLowerCase());
  });
}

async function set(id: string, data: LanguageData) {
  const res = await setObjectToKey('lang', id, data);
  return res === 'OK';
}

async function setStatus(id: string, value: boolean) {
  const client = await getClient();
  const res = await client.json.set(`lang:${id}`, '$.active', value);
  return res === 'OK';
}

async function getByIds(ids: string[]): Promise<Language[]> {
  const client = await getClient();
  const langsData = (await Promise.all(
    ids.map(id => client.json.get(`lang:${id}`)),
  )) as LanguageData[];

  const langs = langsData.map((data, i) => ({ id: ids[i], ...data }));

  return langs;
}

export default { getAll, getById, set, setStatus, getByIds };
