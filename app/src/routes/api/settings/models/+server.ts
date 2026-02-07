import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getBaseUrl } from '$lib/server/ollama';
import { testOllamaConnection } from '$lib/server/detect';
import type { ModelsResponse } from '$lib/types';

export const GET: RequestHandler = async ({ url }) => {
  const urlParam = url.searchParams.get('url');
  let baseUrl: string;

  if (urlParam) {
    try {
      new URL(urlParam);
      baseUrl = urlParam;
    } catch {
      return json(
        { success: false, models: [], error_message: 'URLが不正です' } satisfies ModelsResponse,
        { status: 400 },
      );
    }
  } else {
    baseUrl = getBaseUrl();
  }

  const result = await testOllamaConnection(baseUrl);

  return json({
    success: result.ok,
    models: result.models,
    error_message: result.error,
  } satisfies ModelsResponse);
};
