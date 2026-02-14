import { env } from '$env/dynamic/private';
import type { ProviderType, SettingSource } from '$lib/types';
import { getSetting } from './database';
import { OllamaProvider } from './ollama';
import { OpenAiCompatProvider } from './openai-compat';

export interface TranslateResult {
  translatedText: string;
  prompt: string;
  rawResponse: string;
}

export interface ConnectionTestResult {
  ok: boolean;
  models: string[];
  error?: string;
}

export interface TranslationProvider {
  readonly name: ProviderType;
  getBaseUrl(): string;
  getModel(): string;
  getBaseUrlSource(): SettingSource;
  getModelSource(): SettingSource;
  translateText(
    text: string,
    sourceLang: string,
    targetLang: string,
    referenceText?: string,
  ): Promise<TranslateResult>;
  testConnection(url: string, timeoutMs?: number): Promise<ConnectionTestResult>;
  listModels(url: string, timeoutMs?: number): Promise<ConnectionTestResult>;
}

export function getProviderType(): ProviderType {
  if (env.TRANSLATE_PROVIDER) {
    const val = env.TRANSLATE_PROVIDER;
    if (val === 'ollama' || val === 'openai_compat') return val;
  }
  const dbVal = getSetting('translate_provider');
  if (dbVal === 'ollama' || dbVal === 'openai_compat') return dbVal;
  return 'ollama';
}

export function getProviderSource(): SettingSource {
  if (env.TRANSLATE_PROVIDER) return 'env';
  if (getSetting('translate_provider')) return 'db';
  return 'default';
}

export function getProvider(type?: ProviderType): TranslationProvider {
  const t = type ?? getProviderType();
  if (t === 'openai_compat') return new OpenAiCompatProvider();
  return new OllamaProvider();
}
