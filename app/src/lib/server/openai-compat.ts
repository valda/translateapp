import { env } from '$env/dynamic/private';
import { getSetting } from './database';
import { LANGUAGE_NAMES } from './constants';
import type { SettingSource } from '$lib/types';
import type { TranslationProvider, TranslateResult, ConnectionTestResult } from './provider';

export const DEFAULT_BASE_URL = 'http://localhost:1234';
export const DEFAULT_MODEL = '';

export function getBaseUrl(): string {
  if (env.OPENAI_COMPAT_BASE_URL) return env.OPENAI_COMPAT_BASE_URL;
  return getSetting('openai_compat_base_url') || DEFAULT_BASE_URL;
}

export function getModel(): string {
  if (env.OPENAI_COMPAT_MODEL) return env.OPENAI_COMPAT_MODEL;
  return getSetting('openai_compat_model') || DEFAULT_MODEL;
}

export function getBaseUrlSource(): SettingSource {
  if (env.OPENAI_COMPAT_BASE_URL) return 'env';
  if (getSetting('openai_compat_base_url')) return 'db';
  return 'default';
}

export function getModelSource(): SettingSource {
  if (env.OPENAI_COMPAT_MODEL) return 'env';
  if (getSetting('openai_compat_model')) return 'db';
  return 'default';
}

// 背景・設計:
// /v1/chat/completions を使用する。
// LM Studio 側で Jinja チャットテンプレートと停止トークンを設定し、
// プロンプト構築をサーバー側に委譲する。
// user メッセージは "{source} to {target}: {text}" 形式で送信し、
// referenceText がある場合は system メッセージとして追加する。
// テンプレートがこれらを解析してプロンプトを構築する。

export interface ChatMessage {
  role: string;
  content: string;
}

export function buildMessages(
  text: string,
  sourceLang: string,
  targetLang: string,
  referenceText?: string,
): ChatMessage[] {
  const messages: ChatMessage[] = [];
  if (referenceText) {
    const targetLangName = LANGUAGE_NAMES[targetLang] || targetLang;
    messages.push({
      role: 'system',
      content: `Reference: The following is the original ${targetLangName} text before translation. Preserve the original wording and style as much as possible where the meaning has not been changed:\n${referenceText}`,
    });
  }
  messages.push({ role: 'user', content: `${sourceLang} to ${targetLang}: ${text}` });
  return messages;
}

async function listModelsFromApi(url: string, timeoutMs = 5000): Promise<ConnectionTestResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${url}/v1/models`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, models: [], error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const models = (data.data || []).map((m: { id: string }) => m.id);
    return { ok: true, models };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, models: [], error: message };
  } finally {
    clearTimeout(timeout);
  }
}

export class OpenAiCompatProvider implements TranslationProvider {
  readonly name = 'openai_compat' as const;
  getBaseUrl = getBaseUrl;
  getModel = getModel;
  getBaseUrlSource = getBaseUrlSource;
  getModelSource = getModelSource;

  async translateText(
    text: string,
    sourceLang: string,
    targetLang: string,
    referenceText?: string,
  ): Promise<TranslateResult> {
    const baseUrl = getBaseUrl();
    const model = getModel();
    const messages = buildMessages(text, sourceLang, targetLang, referenceText);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    try {
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.1,
          stream: false,
          max_tokens: 2048,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI互換 API error (${response.status}): ${errorText}`);
      }

      const rawResponse = await response.text();
      const data = JSON.parse(rawResponse);
      const content = data.choices?.[0]?.message?.content || '';
      return {
        translatedText: content.trim(),
        prompt: JSON.stringify(messages),
        rawResponse,
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(`翻訳がタイムアウトしました（120秒）。OpenAI互換サーバー: ${baseUrl}`, {
          cause: error,
        });
      }
      if (
        error instanceof TypeError &&
        (error.message.includes('fetch') || error.message.includes('connect'))
      ) {
        throw new Error(
          `OpenAI互換サーバーに接続できません: ${baseUrl} - サーバーが起動しているか確認してください`,
          { cause: error },
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async testConnection(url: string, timeoutMs?: number): Promise<ConnectionTestResult> {
    return listModelsFromApi(url, timeoutMs);
  }

  async listModels(url: string, timeoutMs?: number): Promise<ConnectionTestResult> {
    return listModelsFromApi(url, timeoutMs);
  }
}
