import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type { z } from 'zod';
import type { changeRequestTable } from '@/core/database/relational/tables';
import type { FeatureStatus, LangFeatures } from '@/core/types';
import type {
  changeRequestSchema,
  rejectChangeRequestSchema,
} from './schemas/change-request';

export type FeatureChangeRequest = InferInsertModel<typeof changeRequestTable>;

export type ChangeRequestFormValues = z.infer<typeof changeRequestSchema>;
export type RejectChangeRequestValues = z.infer<
  typeof rejectChangeRequestSchema
>;

export type ChangeRequestState = InferSelectModel<
  typeof changeRequestTable
>['state'];

/** A change request as the API sends it to the user who made it. */
export type ChangeRequestDTO = {
  id: string;
  lang: string;
  feature: LangFeatures;
  status: FeatureStatus;
  description: string;
  state: ChangeRequestState;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

/** What the administrators review: the request, who made it and the status the language has right now. */
export type AdminChangeRequestDTO = ChangeRequestDTO & {
  user: { id: string; nickname: string };
  /** `null` once the request is resolved or when the language is gone. */
  currentStatus: FeatureStatus | null;
};

export type ChangeRequestReview =
  | { decision: 'accept' }
  | { decision: 'reject'; reason: string };

export type ReviewErrorKey =
  | 'requestNotFound'
  | 'requestAlreadyReviewed'
  | 'langNotFound'
  | 'unknown';

export type ReviewChangeRequestResult =
  | {
      success: true;
      request: ChangeRequestDTO;
      emailSent: boolean;
      key?: never;
    }
  | { success: false; request?: never; emailSent?: never; key: ReviewErrorKey };

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
