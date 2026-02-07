import { env } from '$env/dynamic/private';
import { LANGUAGE_NAMES } from './constants';
import { getSetting } from './database';
import type { SettingSource } from '$lib/types';

export const DEFAULT_BASE_URL = 'http://127.0.0.1:11434';
export const DEFAULT_MODEL = 'translategemma:12b';

export function getBaseUrl(): string {
  if (env.OLLAMA_BASE_URL) return env.OLLAMA_BASE_URL;
  return getSetting('ollama_base_url') || DEFAULT_BASE_URL;
}

export function getModel(): string {
  if (env.OLLAMA_MODEL) return env.OLLAMA_MODEL;
  return getSetting('ollama_model') || DEFAULT_MODEL;
}

export function getBaseUrlSource(): SettingSource {
  if (env.OLLAMA_BASE_URL) return 'env';
  if (getSetting('ollama_base_url')) return 'db';
  return 'default';
}

export function getModelSource(): SettingSource {
  if (env.OLLAMA_MODEL) return 'env';
  if (getSetting('ollama_model')) return 'db';
  return 'default';
}

function createTranslationPrompt(text: string, sourceLang: string, targetLang: string): string {
  const sourceLangName = LANGUAGE_NAMES[sourceLang] || sourceLang;
  const targetLangName = LANGUAGE_NAMES[targetLang] || targetLang;

  return `You are a professional ${sourceLangName} (${sourceLang}) to ${targetLangName} (${targetLang}) translator.
Your goal is to accurately convey the meaning and nuances of the original ${sourceLangName} text while adhering to ${targetLangName} grammar, vocabulary, and cultural sensitivities.
Produce only the ${targetLangName} translation, without any additional explanations or commentary.
Please translate the following ${sourceLangName} text into ${targetLangName}:
${text}`;
}

export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<string> {
  const baseUrl = getBaseUrl();
  const model = getModel();
  const prompt = createTranslationPrompt(text, sourceLang, targetLang);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return (data.response || '').trim();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`翻訳がタイムアウトしました（120秒）。Ollamaサーバー: ${baseUrl}`, {
        cause: error,
      });
    }
    if (
      error instanceof TypeError &&
      (error.message.includes('fetch') || error.message.includes('connect'))
    ) {
      throw new Error(
        `Ollamaサーバーに接続できません: ${baseUrl} - サーバーが起動しているか確認してください`,
        { cause: error },
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
