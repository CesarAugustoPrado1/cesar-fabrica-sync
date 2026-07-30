import fs from 'fs';
import path from 'path';
import { requireEnv } from '../lib/env';
import { sql } from '../lib/db';

requireEnv();

async function migrate() {
  const migrationsDir = path.resolve(process.cwd(), 'db/migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No hay migraciones para ejecutar.');
    return;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  const applied = await sql`
    SELECT filename FROM schema_migrations
  `;
  const appliedSet = new Set(applied.map((row) => row.filename));

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`⏭️  ${file} (ya aplicada)`);
      continue;
    }

    const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`🔄 Aplicando ${file}...`);

    const statements = sqlContent
      .split(';')
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0);

    for (const statement of statements) {
      await sql.query(statement);
    }

    await sql`INSERT INTO schema_migrations (filename) VALUES (${file})`;

    console.log(`✅ ${file} aplicada`);
  }

  console.log('✅ Migraciones completadas.');
}

migrate().catch((error) => {
  console.error('❌ Error en migraciones:', error);
  process.exit(1);
});
