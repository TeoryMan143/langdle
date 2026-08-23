import { db } from '@/core/database/relational/config';
import { changeRequestTable } from '@/core/database/relational/tables';
import type { FeatureChangeRequest } from '@/modules/lang-guess/types';

export async function uploadChangeRequest(change: FeatureChangeRequest) {
  try {
    await db.insert(changeRequestTable).values(change);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}
