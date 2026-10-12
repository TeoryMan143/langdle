import type { InferInsertModel } from 'drizzle-orm';
import type { z } from 'zod';
import type { changeRequestTable } from '@/core/database/relational/tables';
import type { changeRequestSchema } from './schemas/change-request';

export type FeatureChangeRequest = InferInsertModel<typeof changeRequestTable>;

export type ChangeRequestFormValues = z.infer<typeof changeRequestSchema>;

export type PermissionErrorKey =
  | 'userNotFound'
  | 'userIsAdmin'
  | 'tokenNotFound'
  | 'userHasPermission'
  | 'tokenExpired'
  | 'unknown';

export type SetPermissionResult =
  | { success: true; lang: string; key?: never }
  | { success: false; lang?: never; key: PermissionErrorKey };
