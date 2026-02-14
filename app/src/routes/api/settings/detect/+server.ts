import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { detectOllamaUrl, detectOpenAiCompatUrl } from '$lib/server/detect';
import { setSetting } from '$lib/server/database';
import type { DetectResponse, ProviderType } from '$lib/types';

export const POST: RequestHandler = async ({ url }) => {
  const providerParam = url.searchParams.get('provider') as ProviderType | null;
  const provider = providerParam ?? 'ollama';

  let result: { success: boolean; url?: string; message: string };

  if (provider === 'openai_compat') {
    result = await detectOpenAiCompatUrl();
    if (result.success && result.url) {
      setSetting('openai_compat_base_url', result.url);
    }
  } else {
    result = await detectOllamaUrl();
    if (result.success && result.url) {
      setSetting('ollama_base_url', result.url);
    }
  }

  return json(result satisfies DetectResponse);
};
