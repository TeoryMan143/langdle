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

export async function setStringToKey(key: string, value: string) {
  try {
    const client = await getClient();
    await client.set(key, value);
    return true;
  } catch (error) {
    console.error('Redis error', error);
    return false;
  }
}

export async function getStringByKey(key: string) {
  try {
    const client = await getClient();
    return client.get(key);
  } catch (error) {
    console.error('Redis error', error);
    return null;
  }
}
