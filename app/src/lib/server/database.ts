import Database from 'better-sqlite3';
import { env } from '$env/dynamic/private';
import { resolve, dirname } from 'path';
import { mkdirSync } from 'fs';
import type { HistoryItem } from '$lib/types';

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;

  const rawPath = env.DB_PATH || './data/translation_history.db';
  const dbPath = rawPath === ':memory:' ? ':memory:' : resolve(rawPath);
  if (dbPath !== ':memory:') {
    mkdirSync(dirname(dbPath), { recursive: true });
  }

  console.info(`SQLite DB: ${dbPath}`);

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_text TEXT NOT NULL,
      translated_text TEXT NOT NULL,
      source_lang TEXT NOT NULL,
      target_lang TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return db;
}

export function createHistory(data: {
  original_text: string;
  translated_text: string;
  source_lang: string;
  target_lang: string;
}): HistoryItem {
  const d = getDb();
  const stmt = d.prepare(
    'INSERT INTO history (original_text, translated_text, source_lang, target_lang) VALUES (?, ?, ?, ?)',
  );
  const result = stmt.run(
    data.original_text,
    data.translated_text,
    data.source_lang,
    data.target_lang,
  );

  const row = d
    .prepare('SELECT * FROM history WHERE id = ?')
    .get(result.lastInsertRowid) as HistoryItem;
  return row;
}

export function getAllHistory(): HistoryItem[] {
  const d = getDb();
  return d.prepare('SELECT * FROM history ORDER BY id DESC').all() as HistoryItem[];
}

export function searchHistory(keyword: string): HistoryItem[] {
  const d = getDb();
  const pattern = `%${keyword}%`;
  return d
    .prepare(
      'SELECT * FROM history WHERE original_text LIKE ? OR translated_text LIKE ? ORDER BY id DESC',
    )
    .all(pattern, pattern) as HistoryItem[];
}

export function deleteHistory(id: number): boolean {
  const d = getDb();
  const result = d.prepare('DELETE FROM history WHERE id = ?').run(id);
  return result.changes > 0;
}

export function deleteAllHistory(): void {
  const d = getDb();
  d.prepare('DELETE FROM history').run();
}

// --- Settings CRUD ---

export function getSetting(key: string): string | null {
  const d = getDb();
  const row = d.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  const d = getDb();
  d.prepare(
    'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP',
  ).run(key, value);
}

export function getAllSettings(): Record<string, string> {
  const d = getDb();
  const rows = d.prepare('SELECT key, value FROM settings').all() as {
    key: string;
    value: string;
  }[];
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

export function deleteSetting(key: string): boolean {
  const d = getDb();
  const result = d.prepare('DELETE FROM settings WHERE key = ?').run(key);
  return result.changes > 0;
}
