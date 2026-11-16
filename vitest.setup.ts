import { existsSync } from 'node:fs';

// Same as `dotenv.config()`: variables already set win, and a missing file
// (CI has none) is not an error.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

// Importing a service pulls in the database clients, which parse their
// connection strings eagerly. Unit tests that never touch the database still
// need something parseable here (CI does not expose the real secrets).
process.env.DATABASE_URL ??= 'postgres://user:password@localhost:5432/langdle';
