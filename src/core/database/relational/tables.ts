import {
  boolean,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const userTable = pgTable('user', {
  id: uuid('id').primaryKey().defaultRandom(),
  nickname: text().unique().notNull(),
  password: text().notNull(),
  admin: boolean('admin').notNull().default(false),
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
    .default(new Date(Date.now() + 1000 * 60 * 10)),
});
