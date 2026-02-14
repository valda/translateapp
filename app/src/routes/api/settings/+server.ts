import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  getBaseUrl as ollamaGetBaseUrl,
  getModel as ollamaGetModel,
  getBaseUrlSource as ollamaGetBaseUrlSource,
  getModelSource as ollamaGetModelSource,
} from '$lib/server/ollama';
import {
  getBaseUrl as openaiGetBaseUrl,
  getModel as openaiGetModel,
  getBaseUrlSource as openaiGetBaseUrlSource,
  getModelSource as openaiGetModelSource,
} from '$lib/server/openai-compat';
import { getProvider, getProviderType, getProviderSource } from '$lib/server/provider';
import { setSetting } from '$lib/server/database';
import { SettingsUpdateSchema } from '$lib/server/schemas';
import type { SettingsResponse } from '$lib/types';

async function buildSettingsResponse(): Promise<SettingsResponse> {
  const provider = getProvider();
  const baseUrl = provider.getBaseUrl();
  const connection = await provider.testConnection(baseUrl);
  return {
    settings: {
      translate_provider: getProviderType(),
      translate_provider_source: getProviderSource(),
      ollama_base_url: ollamaGetBaseUrl(),
      ollama_model: ollamaGetModel(),
      ollama_base_url_source: ollamaGetBaseUrlSource(),
      ollama_model_source: ollamaGetModelSource(),
      openai_compat_base_url: openaiGetBaseUrl(),
      openai_compat_model: openaiGetModel(),
      openai_compat_base_url_source: openaiGetBaseUrlSource(),
      openai_compat_model_source: openaiGetModelSource(),
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

  const {
    translate_provider,
    ollama_base_url,
    ollama_model,
    openai_compat_base_url,
    openai_compat_model,
  } = parsed.data;

  if (translate_provider !== undefined) {
    setSetting('translate_provider', translate_provider);
  }
  if (ollama_base_url !== undefined) {
    setSetting('ollama_base_url', ollama_base_url);
  }
  if (ollama_model !== undefined) {
    setSetting('ollama_model', ollama_model);
  }
  if (openai_compat_base_url !== undefined) {
    setSetting('openai_compat_base_url', openai_compat_base_url);
  }
  if (openai_compat_model !== undefined) {
    setSetting('openai_compat_model', openai_compat_model);
  }

  return json(await buildSettingsResponse());
};
