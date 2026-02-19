#!/usr/bin/env node
/**
 * Minimal migration runner — no external deps beyond `pg`.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node db/migrate.js
 *
 * Strategy:
 *   - Keeps a `schema_migrations` table that records applied migration filenames.
 *   - Scans db/migrations/*.sql in lexicographic order.
 *   - Runs each file that hasn't been recorded yet, inside a transaction.
 *   - Idempotent: safe to run on every deploy.
 */

'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { Pool } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Ensure the tracking table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    // Find already-applied migrations
    const { rows } = await pool.query('SELECT filename FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.filename));

    // Collect pending .sql files in order
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log('No pending migrations.');
      return;
    }

    for (const filename of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');
      console.log(`Applying ${filename}...`);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [filename]
        );
        await client.query('COMMIT');
        console.log(`  ✓ ${filename}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${filename} failed: ${err.message}`);
      } finally {
        client.release();
      }
    }

    console.log(`${pending.length} migration(s) applied.`);
  } finally {
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
