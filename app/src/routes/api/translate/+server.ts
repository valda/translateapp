import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { TranslationRequestSchema } from '$lib/server/schemas';
import { getProvider } from '$lib/server/provider';

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'リクエストボディが不正です' }, { status: 400 });
  }

  const parsed = TranslationRequestSchema.safeParse(body);

  if (!parsed.success) {
    return json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { text, source_lang, target_lang, reference_text } = parsed.data;

  try {
    const provider = getProvider();
    const result = await provider.translateText(text, source_lang, target_lang, reference_text);
    return json({
      original_text: text,
      translated_text: result.translatedText,
      source_lang,
      target_lang,
      success: true,
      debug: {
        prompt: result.prompt,
        raw_response: result.rawResponse,
      },
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
