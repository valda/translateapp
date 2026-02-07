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
