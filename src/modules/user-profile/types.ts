import type { z } from 'zod';
import type { UserDTO } from '@/modules/auth/types';
import type {
  updateFluentLangsSchema,
  updateNativeLangSchema,
} from './schemas/profile';

export type UpdateNativeLangReq = z.infer<typeof updateNativeLangSchema>;
export type UpdateFluentLangsReq = z.infer<typeof updateFluentLangsSchema>;

/** What anyone may read of a user: never the email or the OAuth ids. */
export type PublicProfile = Pick<
  UserDTO,
  'id' | 'nickname' | 'country' | 'admin' | 'nativeLanguage' | 'fluent'
>;
