import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { langFeatures } from '@/core/lib/features';

export const userTable = pgTable('user', {
  id: uuid('id').primaryKey().defaultRandom(),
  nickname: text().unique().notNull(),
  password: text(),
  email: text().unique().notNull(),
  googleId: text(),
  appleId: text('apple_id').unique(),
  country: text().notNull(),
  admin: boolean('admin').notNull().default(false),
  nativeLanguage: text('native_language'),
  fluent: text('fluent'),
});

export const gameHistoryTable = pgTable('game_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => userTable.id, { onDelete: 'cascade' }),
  date: date('date').notNull().defaultNow(),
  type: text('type').$type<'daily' | 'random'>().notNull(),
  targetLang: text('target_lang').notNull(),
  guesses: integer().notNull(),
  guessed: boolean().notNull(),
});

export const sessionTable = pgTable('session', {
  id: text('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => userTable.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', {
    withTimezone: true,
    mode: 'date',
  }).notNull(),
});

export const langPermissionTable = pgTable(
  'lang_permission',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => userTable.id),
    lang: text('lang').notNull(),
  },
  t => [primaryKey({ columns: [t.userId, t.lang] })],
);

export const langTokenTable = pgTable('lang_token', {
  id: uuid().defaultRandom().primaryKey(),
  code: text().notNull(),
  lang: text().notNull(),
  expiresAt: timestamp('expires_at', {
    withTimezone: true,
    mode: 'date',
  })
    .notNull()
    .default(sql`now() + interval '10 minutes'`),
});

export const featuresEnum = pgEnum('features', langFeatures);
export const statusEnum = pgEnum('feature_status', [
  'present',
  'absent',
  'partial',
]);

export const changeRequestStateEnum = pgEnum('change_request_state', [
  'pending',
  'accepted',
  'rejected',
]);

export const changeRequestTable = pgTable('change_request', {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => userTable.id),
  lang: text().notNull(),
  feature: featuresEnum().notNull(),
  status: statusEnum().notNull(),
  description: text().notNull(),
  state: changeRequestStateEnum().notNull().default('pending'),
  rejectionReason: text('rejection_reason'),
  /** Language of the requester, so the resolution email speaks it. */
  locale: text().notNull().default('en'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true, mode: 'date' }),
  reviewedBy: uuid('reviewed_by').references(() => userTable.id),
});

/** A language a user wants added to the game, waiting for an administrator. */
export const languageRequestTable = pgTable(
  'language_request',
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => userTable.id, { onDelete: 'cascade' }),
    /** ISO code the language will be stored under (`lang:<code>`). */
    code: text().notNull(),
    name: text().notNull(),
    exonym: text(),
    features: featuresEnum().array().notNull().default(sql`'{}'`),
    partial: featuresEnum().array().notNull().default(sql`'{}'`),
    description: text().notNull(),
    /** Bucket key of the uploaded flag while the request is open. */
    flagKey: text('flag_key').notNull(),
    state: changeRequestStateEnum().notNull().default('pending'),
    rejectionReason: text('rejection_reason'),
    /** Language of the requester, so the resolution email speaks it. */
    locale: text().notNull().default('en'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true, mode: 'date' }),
    reviewedBy: uuid('reviewed_by').references(() => userTable.id),
  },
  t => [
    // A language can only have one open request at a time.
    uniqueIndex('language_request_pending_code')
      .on(t.code)
      .where(sql`${t.state} = 'pending'`),
    index('language_request_user').on(t.userId),
  ],
);
