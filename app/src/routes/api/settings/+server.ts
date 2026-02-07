import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getBaseUrl, getModel, getBaseUrlSource, getModelSource } from '$lib/server/ollama';
import { setSetting } from '$lib/server/database';
import { SettingsUpdateSchema } from '$lib/server/schemas';
import { testOllamaConnection } from '$lib/server/detect';
import type { SettingsResponse } from '$lib/types';

async function buildSettingsResponse(): Promise<SettingsResponse> {
  const baseUrl = getBaseUrl();
  const connection = await testOllamaConnection(baseUrl);
  return {
    settings: {
      ollama_base_url: baseUrl,
      ollama_model: getModel(),
      ollama_base_url_source: getBaseUrlSource(),
      ollama_model_source: getModelSource(),
    },
    connection_ok: connection.ok,
  };
}

export const GET: RequestHandler = async () => {
  return json(await buildSettingsResponse());
};

export const PUT: RequestHandler = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'リクエストボディが不正です' }, { status: 400 });
  }

  const parsed = SettingsUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return json({ error: '入力が不正です', details: parsed.error.flatten() }, { status: 400 });
  }

  const { ollama_base_url, ollama_model } = parsed.data;

  if (ollama_base_url !== undefined) {
    setSetting('ollama_base_url', ollama_base_url);
  }
  if (ollama_model !== undefined) {
    setSetting('ollama_model', ollama_model);
  }

  return json(await buildSettingsResponse());
};
