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
