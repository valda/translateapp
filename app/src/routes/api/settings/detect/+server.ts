import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { detectOllamaUrl } from '$lib/server/detect';
import { setSetting } from '$lib/server/database';
import type { DetectResponse } from '$lib/types';

export const POST: RequestHandler = async () => {
  const result = await detectOllamaUrl();

  if (result.success && result.url) {
    setSetting('ollama_base_url', result.url);
  }

  const response: DetectResponse = {
    success: result.success,
    url: result.url,
    message: result.message,
  };

  return json(response);
};
