import { boolean, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const userTable = pgTable('user', {
  id: uuid('id').primaryKey().defaultRandom(),
  nickname: text().unique().notNull(),
  password: text().notNull(),
  admin: boolean('admin').default(false),
});

export const sessionTable = pgTable('session', {
  id: text('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => userTable.id),
  expiresAt: timestamp('expires_at', {
    withTimezone: true,
    mode: 'date',
  }).notNull(),
});

export const langPersissionTable = pgTable('lang_persission', {
  userId: uuid('user_id')
    .notNull().references(() => userTable.id),
  lang: text('lang').notNull(),
}, (t) => ([
  primaryKey({columns: [t.userId, t.lang]})
]))
