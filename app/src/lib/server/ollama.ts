import { env } from '$env/dynamic/private';
import { LANGUAGE_NAMES } from './constants';

function getBaseUrl(): string {
  return env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
}

function getModel(): string {
  return env.OLLAMA_MODEL || 'translategemma:12b';
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
