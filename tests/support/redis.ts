import { createClient, SchemaFieldTypes } from 'redis';

export const LANG_INDEX = 'idx:langs';

/**
 * Rebuilds the RediSearch index over the `lang:*` JSON documents. The index of
 * the real deployment lives only in Redis Cloud, so this is the definition the
 * queries in `lang-data/service.ts` need: `getAllLanguages` filters on
 * `@active:{true}` and returns the `$.…` paths.
 */
export async function createLangIndex(client: ReturnType<typeof createClient>) {
  await client.ft.create(
    LANG_INDEX,
    {
      '$.name': { type: SchemaFieldTypes.TEXT, AS: 'name' },
      '$.exonym': { type: SchemaFieldTypes.TEXT, AS: 'exonym' },
      '$.active': { type: SchemaFieldTypes.TAG, AS: 'active' },
      '$.features[*]': { type: SchemaFieldTypes.TAG, AS: 'features' },
      '$.partial[*]': { type: SchemaFieldTypes.TAG, AS: 'partial' },
    },
    { ON: 'JSON', PREFIX: 'lang:' },
  );
}

/** Wipes every key and index, then restores the empty language index. */
export async function resetRedis(client: ReturnType<typeof createClient>) {
  await client.flushAll();
  await createLangIndex(client);
}
