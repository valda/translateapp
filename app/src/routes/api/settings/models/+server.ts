import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProvider } from '$lib/server/provider';
import type { ProviderType, ModelsResponse } from '$lib/types';

export const GET: RequestHandler = async ({ url }) => {
  const urlParam = url.searchParams.get('url');
  const providerParam = url.searchParams.get('provider') as ProviderType | null;
  const provider = getProvider(providerParam ?? undefined);

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
    baseUrl = provider.getBaseUrl();
  }

  const result = await provider.listModels(baseUrl);

  return json({
    success: result.ok,
    models: result.models,
    error_message: result.error,
  } satisfies ModelsResponse);
};
