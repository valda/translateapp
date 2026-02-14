export interface HistoryItem {
  id: number;
  original_text: string;
  translated_text: string;
  source_lang: string;
  target_lang: string;
  created_at: string;
}

export interface TranslationResponse {
  original_text: string;
  translated_text: string;
  source_lang: string;
  target_lang: string;
  success: boolean;
  error_message?: string;
  debug?: {
    prompt: string;
    raw_response: string;
  };
}

export type SettingSource = 'env' | 'db' | 'default';

export type ProviderType = 'ollama' | 'openai_compat';

export interface AppSettings {
  translate_provider: ProviderType;
  translate_provider_source: SettingSource;
  // Ollama
  ollama_base_url: string;
  ollama_model: string;
  ollama_base_url_source: SettingSource;
  ollama_model_source: SettingSource;
  // OpenAI互換
  openai_compat_base_url: string;
  openai_compat_model: string;
  openai_compat_base_url_source: SettingSource;
  openai_compat_model_source: SettingSource;
}

export interface SettingsResponse {
  settings: AppSettings;
  connection_ok: boolean;
}

export interface DetectResponse {
  success: boolean;
  url?: string;
  message: string;
}

export interface ModelsResponse {
  success: boolean;
  models: string[];
  error_message?: string;
}
