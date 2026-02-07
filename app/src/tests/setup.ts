import { vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({
  env: {
    DB_PATH: ':memory:',
    OLLAMA_BASE_URL: 'http://127.0.0.1:11434',
    OLLAMA_MODEL: 'translategemma:12b',
  },
}));
