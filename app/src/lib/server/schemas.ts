import { z } from 'zod';

export const TranslationRequestSchema = z.object({
  text: z.string().min(1),
  source_lang: z.string().min(1),
  target_lang: z.string().min(1),
  reference_text: z.string().optional(),
});

export const HistoryCreateSchema = z.object({
  original_text: z.string().min(1),
  translated_text: z.string().min(1),
  source_lang: z.string().min(1),
  target_lang: z.string().min(1),
});

export const SettingsUpdateSchema = z.object({
  translate_provider: z.enum(['ollama', 'openai_compat']).optional(),
  ollama_base_url: z.string().url().optional(),
  ollama_model: z.string().min(1).optional(),
  openai_compat_base_url: z.string().url().optional(),
  openai_compat_model: z.string().min(1).optional(),
});
