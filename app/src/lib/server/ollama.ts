import { env } from '$env/dynamic/private';
import { LANGUAGE_NAMES } from './constants';
import { getSetting } from './database';
import type { SettingSource } from '$lib/types';
import type { TranslationProvider, ConnectionTestResult } from './provider';
import { testOllamaConnection } from './detect';

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

export function createTranslationPrompt(
  text: string,
  sourceLang: string,
  targetLang: string,
  referenceText?: string,
): string {
  const sourceLangName = LANGUAGE_NAMES[sourceLang] || sourceLang;
  const targetLangName = LANGUAGE_NAMES[targetLang] || targetLang;

  let prompt = `You are a professional ${sourceLangName} (${sourceLang}) to ${targetLangName} (${targetLang}) translator.
Your goal is to accurately convey the meaning and nuances of the original ${sourceLangName} text while adhering to ${targetLangName} grammar, vocabulary, and cultural sensitivities.
Produce only the ${targetLangName} translation, without any additional explanations or commentary.
Please translate the following ${sourceLangName} text into ${targetLangName}:
${text}`;

  if (referenceText) {
    prompt += `\nReference: The following is the original ${targetLangName} text before translation. Preserve the original wording and style as much as possible where the meaning has not been changed:\n${referenceText}`;
  }

  return prompt;
}

export type { TranslateResult } from './provider';

export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string,
  referenceText?: string,
): Promise<TranslateResult> {
  const baseUrl = getBaseUrl();
  const model = getModel();
  const prompt = createTranslationPrompt(text, sourceLang, targetLang, referenceText);

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

    const rawResponse = await response.text();
    const data = JSON.parse(rawResponse);
    return {
      translatedText: (data.response || '').trim(),
      prompt,
      rawResponse,
    };
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

export class OllamaProvider implements TranslationProvider {
  readonly name = 'ollama' as const;
  getBaseUrl = getBaseUrl;
  getModel = getModel;
  getBaseUrlSource = getBaseUrlSource;
  getModelSource = getModelSource;
  translateText = translateText;
  async testConnection(url: string, timeoutMs?: number): Promise<ConnectionTestResult> {
    return testOllamaConnection(url, timeoutMs);
  }
  async listModels(url: string, timeoutMs?: number): Promise<ConnectionTestResult> {
    return testOllamaConnection(url, timeoutMs);
  }
}
