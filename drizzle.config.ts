import { defineConfig } from 'drizzle-kit';
import 'dotenv/config'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/core/database/relational/tables.ts',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
