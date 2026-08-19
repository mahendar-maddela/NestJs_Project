import 'reflect-metadata';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

/**
 * Used by the TypeORM CLI (migrations, schema sync) and available for standalone scripts.
 * Entities live per-module (`modules/<name>/src/entities/*.entity.ts`), never in this lib —
 * discovered here by glob rather than a central barrel, so no module ever needs to be
 * "registered" in `libs/database` just to have its tables picked up.
 */
export const AppDataSource = new DataSource({
  type: 'mysql',
  url: process.env.DATABASE_URL,
  entities: [join(__dirname, '../../modules/**/*.entity{.ts,.js}').replace(/\\/g, '/')],
  migrations: [join(__dirname, 'migrations', '*{.ts,.js}').replace(/\\/g, '/')],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
});
