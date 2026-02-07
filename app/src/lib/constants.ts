export interface Language {
  code: string;
  name: string;
}

export const LANGUAGES: Language[] = [
  { code: 'ja', name: '日本語' },
  { code: 'en', name: '英語' },
  { code: 'zh-Hans', name: '中国語（簡体字）' },
  { code: 'ko', name: '韓国語' },
  { code: 'fr', name: 'フランス語' },
  { code: 'de', name: 'ドイツ語' },
  { code: 'es', name: 'スペイン語' },
  { code: 'pt', name: 'ポルトガル語' },
];
