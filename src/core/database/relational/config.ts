import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './tables';

const sql = neon(process.env.DATABASE_URL as string);

export const db = drizzle(sql, { schema });
