import type { LanguageData, Language } from '@/core/lib/types';
import langRepository from '@/app/api/repositories/langs';

export async function getLanguageById(
  id: string,
): Promise<Language | undefined> {
  const data = await langRepository.getById(id);

  if (!data) {
    return;
  }

  const langData = { id, ...data };
  return langData;
}

export function getAllLanguages(): Promise<Language[]> {
  return langRepository.getAll();
}

export function setLanguageData({
  id,
  data,
}: {
  id: string;
  data: LanguageData;
}) {
  return langRepository.set(id, data);
}

export function getLanguagesByIds(ids: string[]) {
  return langRepository.getByIds(ids);
}
