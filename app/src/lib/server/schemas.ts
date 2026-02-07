import { z } from 'zod';

export const TranslationRequestSchema = z.object({
  text: z.string().min(1),
  source_lang: z.string().min(1),
  target_lang: z.string().min(1),
});

export const HistoryCreateSchema = z.object({
  original_text: z.string().min(1),
  translated_text: z.string().min(1),
  source_lang: z.string().min(1),
  target_lang: z.string().min(1),
});
