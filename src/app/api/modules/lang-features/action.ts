import langRepository from '@/app/api/repositories/langs';
import type { Language, LanguageData } from '@/core/lib/types';

export async function getLanguageById(
  id: string,
): Promise<Language | undefined> {
  const data = await langRepository.getById(id);

  return data;
}

export function getAllLanguages(onlyActives = false): Promise<Language[]> {
  return langRepository.getAll(onlyActives);
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
