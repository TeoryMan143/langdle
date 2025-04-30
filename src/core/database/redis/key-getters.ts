import { client } from './config.ts';

export async function getObjectByKey(group: string, id: string) {
  try {
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
  obj: Record<string, any>,
) {
  try {
    const lang = await client.json.set(`${group}:${id}`, '$', obj);
    return lang;
  } catch (error) {
    console.error('Redis error', error);
    return;
  }
}
