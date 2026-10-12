import { is } from 'drizzle-orm';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';
import { afterAll, describe, expect, inject, test } from 'vitest';
import { db } from '@/core/database/relational/config';
import * as tables from '@/core/database/relational/tables';
import { langFeatures } from '@/core/lib/features';
import {
  createTestUser,
  seedChangeRequest,
  seedHistory,
} from '../support/factories';

const pool = new Pool({ connectionString: inject('postgresUrl') });

afterAll(() => pool.end());

describe('migrations', () => {
  const definedTables = Object.values(tables).filter(value =>
    is(value, PgTable),
  );

  test('the tables module defines the tables we expect', () => {
    expect(
      definedTables.map(table => getTableConfig(table).name).sort(),
    ).toEqual([
      'change_request',
      'game_history',
      'lang_permission',
      'lang_token',
      'session',
      'user',
    ]);
  });

  test.each(
    definedTables.map(table => [getTableConfig(table).name, table] as const),
  )('the %s table has every column tables.ts declares', async (name, table) => {
    const { rows } = await pool.query<{ column_name: string }>(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = $1`,
      [name],
    );

    expect(rows.map(row => row.column_name).sort()).toEqual(
      getTableConfig(table)
        .columns.map(column => column.name)
        .sort(),
    );
  });

  test('the features enum lists every catalogue feature', async () => {
    const { rows } = await pool.query<{ label: string }>(
      `select enumlabel as label from pg_enum
       join pg_type on pg_type.oid = pg_enum.enumtypid
       where typname = 'features' order by enumsortorder`,
    );

    expect(rows.map(row => row.label)).toEqual([...langFeatures]);
  });

  test('the status and state enums have their values', async () => {
    const labels = async (type: string) =>
      (
        await pool.query<{ label: string }>(
          `select enumlabel as label from pg_enum
           join pg_type on pg_type.oid = pg_enum.enumtypid
           where typname = $1 order by enumsortorder`,
          [type],
        )
      ).rows.map(row => row.label);

    expect(await labels('feature_status')).toEqual([
      'present',
      'absent',
      'partial',
    ]);
    expect(await labels('change_request_state')).toEqual([
      'pending',
      'accepted',
      'rejected',
    ]);
  });
});

describe('constraints', () => {
  test('nicknames are unique', async () => {
    await createTestUser({ nickname: 'ana' });

    await expect(createTestUser({ nickname: 'ana' })).rejects.toThrow(
      /user_nickname_unique/,
    );
  });

  test('emails are unique', async () => {
    await createTestUser({ email: 'ana@langdle.test' });

    await expect(createTestUser({ email: 'ana@langdle.test' })).rejects.toThrow(
      /user_email_unique/,
    );
  });

  test('a game cannot belong to a user that does not exist', async () => {
    await expect(
      seedHistory('00000000-0000-4000-8000-000000000000'),
    ).rejects.toThrow(/game_history_user_id_user_id_fk/);
  });

  test('a change request cannot have an unknown feature or status', async () => {
    const { user } = await createTestUser();

    await expect(
      pool.query(
        `insert into change_request (user_id, lang, feature, status, description)
         values ($1, 'spanish', 'notAFeature', 'present', 'x')`,
        [user.id],
      ),
    ).rejects.toThrow(/invalid input value for enum features/);

    await expect(
      pool.query(
        `insert into change_request (user_id, lang, feature, status, description)
         values ($1, 'spanish', 'tones', 'maybe', 'x')`,
        [user.id],
      ),
    ).rejects.toThrow(/invalid input value for enum feature_status/);
  });

  test('a change request starts pending, in english, with a creation date', async () => {
    const { user } = await createTestUser();
    const request = await seedChangeRequest({ userId: user.id });

    expect(request).toMatchObject({
      state: 'pending',
      locale: 'en',
      rejectionReason: null,
      reviewedAt: null,
      reviewedBy: null,
    });
    expect(request.createdAt).toBeInstanceOf(Date);
  });

  test('a game defaults its date to today', async () => {
    const { user } = await createTestUser();
    const game = await seedHistory(user.id);

    expect(game.date).toBe(new Date().toISOString().slice(0, 10));
  });

  test('a user is not an administrator by default', async () => {
    const { user } = await createTestUser();

    expect(user.admin).toBe(false);
  });

  test('a language can be granted to a user only once', async () => {
    const { user } = await createTestUser();
    await db
      .insert(tables.langPermissionTable)
      .values({ userId: user.id, lang: 'spanish' });

    await expect(
      db
        .insert(tables.langPermissionTable)
        .values({ userId: user.id, lang: 'spanish' }),
    ).rejects.toThrow(/lang_permission_user_id_lang_pk/);
  });
});

describe('cascades', () => {
  test('deleting a user deletes their sessions and games', async () => {
    const { user } = await createTestUser();
    await seedHistory(user.id);

    await pool.query('delete from "user" where id = $1', [user.id]);

    const sessions = await pool.query('select 1 from session');
    const games = await pool.query('select 1 from game_history');

    expect(sessions.rowCount).toBe(0);
    expect(games.rowCount).toBe(0);
  });

  test('a user with change requests cannot be deleted', async () => {
    const { user } = await createTestUser();
    await seedChangeRequest({ userId: user.id });

    await expect(
      pool.query('delete from "user" where id = $1', [user.id]),
    ).rejects.toThrow(/change_request_user_id_user_id_fk/);
  });
});
