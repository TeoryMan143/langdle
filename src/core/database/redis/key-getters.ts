import { getClient } from './config';

export async function getObjectByKey(group: string, id: string) {
  try {
    const client = await getClient();
    const lang = await client.json.get(`${group}:${id}`);
    return lang as object;
  } catch (error) {
    console.error('Redis error', error);
    return;
  }
}

export async function setObjectToKey(
  group: string,
  id: string,
  // biome-ignore lint/suspicious/noExplicitAny: There is no way to know the structure of the object
  obj: Record<string, any>,
) {
  try {
    const client = await getClient();
    const lang = await client.json.set(`${group}:${id}`, '$', obj);
    return lang;
  } catch (error) {
    console.error('Redis error', error);
    return;
  }
}

/** `ttlSeconds` makes the key expire on its own; without it the key is kept. */
export async function setStringToKey(
  key: string,
  value: string,
  ttlSeconds?: number,
) {
  try {
    const client = await getClient();
    await client.set(key, value, ttlSeconds ? { EX: ttlSeconds } : undefined);
    return true;
  } catch (error) {
    console.error('Redis error', error);
    return false;
  }
}

export async function getStringByKey(key: string) {
  try {
    const client = await getClient();
    return await client.get(key);
  } catch (error) {
    console.error('Redis error', error);
    return null;
  }
}

export async function deleteKeys(keys: string[]) {
  if (keys.length === 0) {
    return true;
  }

  try {
    const client = await getClient();
    await client.del(keys);
    return true;
  } catch (error) {
    console.error('Redis error', error);
    return false;
  }
}

/**
 * Appends an entry to a stream and answers its id (`<ms>-<seq>`), `null` when
 * Redis failed. `ttlSeconds` makes the whole stream expire that long after its
 * last entry.
 */
export async function appendToStream(
  key: string,
  fields: Record<string, string>,
  ttlSeconds?: number,
) {
  try {
    const client = await getClient();
    const transaction = client.multi().xAdd(key, '*', fields);

    if (ttlSeconds) {
      transaction.expire(key, ttlSeconds);
    }

    const [id] = await transaction.exec();
    return typeof id === 'string' ? id : null;
  } catch (error) {
    console.error('Redis error', error);
    return null;
  }
}

/**
 * Up to `count` entries of a stream, newest first. With `before`, only the
 * ones older than that entry id. `null` when Redis failed; a missing stream
 * reads as empty.
 */
export async function readStreamNewestFirst(
  key: string,
  { count, before }: { count: number; before?: string },
) {
  try {
    const client = await getClient();
    return await client.xRevRange(key, before ? `(${before}` : '+', '-', {
      COUNT: count,
    });
  } catch (error) {
    console.error('Redis error', error);
    return null;
  }
}

/** The number of entries of a stream (0 when missing), `null` when Redis failed. */
export async function streamLength(key: string) {
  try {
    const client = await getClient();
    return await client.xLen(key);
  } catch (error) {
    console.error('Redis error', error);
    return null;
  }
}

/**
 * Removes the entries of a stream for which `matches` holds, reading it
 * `batchSize` entries at a time. Answers how many it removed, `null` when
 * Redis failed.
 */
export async function deleteStreamEntries(
  key: string,
  matches: (fields: Record<string, string>) => boolean,
  batchSize = 1000,
) {
  try {
    const client = await getClient();
    let start = '-';
    let removed = 0;

    while (true) {
      const entries = await client.xRange(key, start, '+', {
        COUNT: batchSize,
      });
      const ids = entries.filter(e => matches(e.message)).map(e => e.id);

      if (ids.length) {
        removed += await client.xDel(key, ids);
      }

      if (entries.length < batchSize) {
        return removed;
      }

      start = `(${entries[entries.length - 1].id}`;
    }
  } catch (error) {
    console.error('Redis error', error);
    return null;
  }
}
