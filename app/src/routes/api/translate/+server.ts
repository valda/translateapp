import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { TranslationRequestSchema } from '$lib/server/schemas';
import { translateText } from '$lib/server/ollama';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const parsed = TranslationRequestSchema.safeParse(body);

  if (!parsed.success) {
    return json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { text, source_lang, target_lang } = parsed.data;

  try {
    const translatedText = await translateText(text, source_lang, target_lang);
    return json({
      original_text: text,
      translated_text: translatedText,
      source_lang,
      target_lang,
      success: true,
      error_message: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '翻訳中にエラーが発生しました';
    return json({
      original_text: text,
      translated_text: '',
      source_lang,
      target_lang,
      success: false,
      error_message: message,
    });
  }
};
