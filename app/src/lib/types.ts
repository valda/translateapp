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
  error_message?: string | null;
}
