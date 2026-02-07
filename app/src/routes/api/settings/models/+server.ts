import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getBaseUrl } from '$lib/server/ollama';
import { testOllamaConnection } from '$lib/server/detect';
import type { ModelsResponse } from '$lib/types';

export const GET: RequestHandler = async () => {
  const baseUrl = getBaseUrl();
  const result = await testOllamaConnection(baseUrl);

  const response: ModelsResponse = {
    success: result.ok,
    models: result.models,
    error_message: result.error,
  };

  return json(response);
};
