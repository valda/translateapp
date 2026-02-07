import { unlinkSync } from 'fs';

export default function globalTeardown() {
  try {
    unlinkSync('./data/e2e_test.db');
  } catch {
    // ファイルが存在しない場合は無視
  }
}
