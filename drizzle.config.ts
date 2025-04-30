import { defineConfig } from 'drizzle-kit';
import 'dotenv/config'

export default defineConfig({
  dialect: 'postgresql',
  schema: './database/tables.ts',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
