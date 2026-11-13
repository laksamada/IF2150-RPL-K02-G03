/**
 * Dijalankan sekali sebelum semua test: kosongkan basis data test, migrasi, lalu seed.
 * Butuh PostgreSQL dari docker-compose (`npm run db:up` di folder src/).
 *
 * Foto (seed + unggahan test) ditulis ke config.uploadDir mode test, yaitu folder sementara OS,
 * bukan server/uploads. Folder itu dikosongkan sebelum dan sesudah test.
 */
import fs from 'node:fs/promises';

export default async function setup() {
  process.env.NODE_ENV = 'test';
  const { config } = await import('../../src/config.js');
  const { migrate } = await import('../../src/db/migrate.js');
  const { seed } = await import('../../src/db/seed.js');
  const { pool } = await import('../../src/db/pool.js');
  const diam = () => {};
  await fs.rm(config.uploadDir, { recursive: true, force: true });
  try {
    await migrate({ reset: true, log: diam });
    await seed({ log: diam });
  } finally {
    await pool.end();
  }

  return async function teardown() {
    await fs.rm(config.uploadDir, { recursive: true, force: true });
  };
}
