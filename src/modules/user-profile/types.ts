import type { z } from 'zod';
import type {
  updateFluentLangsSchema,
  updateNativeLangSchema,
} from './schemas/profile';

export type UpdateNativeLangReq = z.infer<typeof updateNativeLangSchema>;
export type UpdateFluentLangsReq = z.infer<typeof updateFluentLangsSchema>;
