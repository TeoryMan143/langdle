import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type { z } from 'zod';
import type {
  changeRequestTable,
  languageRequestTable,
} from '@/core/database/relational/tables';
import type { FeatureStatus, LangFeatures, Language } from '@/core/types';
import type {
  changeRequestSchema,
  rejectChangeRequestSchema,
} from './schemas/change-request';
import type { languageRequestSchema } from './schemas/language-request';

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

/* -------------------------------------------------------------------------- */
/*                              Language requests                             */
/* -------------------------------------------------------------------------- */

export type NewLanguageRequest = InferInsertModel<typeof languageRequestTable>;

/** What the form fills in; the flag is sent beside it as a file. */
export type LanguageRequestFormValues = z.input<typeof languageRequestSchema>;
export type LanguageRequestValues = z.output<typeof languageRequestSchema>;

/** A language request as the API sends it to the user who made it. */
export type LanguageRequestDTO = {
  id: string;
  code: string;
  name: string;
  exonym: string | null;
  features: LangFeatures[];
  partial: LangFeatures[];
  description: string;
  /**
   * Public URL of the flag: the upload while pending, the published flag once
   * accepted, `null` once rejected (the upload is deleted).
   */
  flagUrl: string | null;
  state: ChangeRequestState;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type AdminLanguageRequestDTO = LanguageRequestDTO & {
  user: { id: string; nickname: string };
};

export type CreateLanguageRequestErrorKey =
  | 'langExists'
  | 'requestPending'
  | 'invalidFlag'
  | 'unknown';

export type CreateLanguageRequestResult =
  | { success: true; request: LanguageRequestDTO; key?: never }
  | { success: false; request?: never; key: CreateLanguageRequestErrorKey };

export type LanguageReviewErrorKey =
  | 'requestNotFound'
  | 'requestAlreadyReviewed'
  | 'langExists'
  | 'unknown';

export type ReviewLanguageRequestResult =
  | {
      success: true;
      request: LanguageRequestDTO;
      emailSent: boolean;
      key?: never;
    }
  | {
      success: false;
      request?: never;
      emailSent?: never;
      key: LanguageReviewErrorKey;
    };

/* -------------------------------------------------------------------------- */
/*                              Catalogue paging                              */
/* -------------------------------------------------------------------------- */

/** Which batch to read: the parsed `GET /lang/page` query, cursor still opaque. */
export type LanguagePageOptions = {
  limit: number;
  cursor?: string;
  onlyActives?: boolean;
  query?: string;
};

/** The same options for the clients, which may leave the limit to the API. */
export type LanguagePageParams = Partial<LanguagePageOptions>;

/**
 * One batch of the catalogue, sorted by name. `nextCursor` is opaque: send it
 * back as `?cursor=` for the next batch; `null` means this was the last one.
 * `total` counts every language matching the filters, not only this page.
 */
export type LanguagePage = {
  items: Language[];
  nextCursor: string | null;
  total: number;
};

export type LanguagePageResult =
  | { success: true; page: LanguagePage }
  | { success: false; key: 'invalidCursor' | 'unknown' };

/** The counters the atlas shows above the catalogue. */
export type LanguagesSummary = {
  languages: number;
  activeLanguages: number;
  activeFeatures: number;
  partialFeatures: number;
};
