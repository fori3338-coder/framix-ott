/**
 * 지원 언어 목록 (요구사항: 30개 언어) + GPT/Gemini 번역용 언어 이름 맵
 * 기존 src/lib/subtitlePipeline.ts의 PIPELINE_TARGET_LANGS와 동일하게 유지.
 */

export const PIPELINE_TARGET_LANGS = [
  'en', 'ja', 'zh', 'zh-tw', 'es', 'hi', 'ar', 'pt-br',
  'fr', 'de', 'id', 'ru', 'tr', 'vi', 'th', 'ms',
  'it', 'nl', 'pl', 'ur', 'bn', 'fa', 'sv', 'da',
  'no', 'ro', 'cs', 'el', 'uk', 'hr',
] as const;

export type TargetLang = (typeof PIPELINE_TARGET_LANGS)[number];

export const LANG_NAMES: Record<string, string> = {
  en: 'English', ja: '日本語', zh: '中文(简体)', 'zh-tw': '中文(繁體)',
  es: 'Español', hi: 'हिन्दी', ar: 'العربية', 'pt-br': 'Português (Brasil)',
  fr: 'Français', de: 'Deutsch', id: 'Bahasa Indonesia', ru: 'Русский',
  tr: 'Türkçe', vi: 'Tiếng Việt', th: 'ภาษาไทย', ms: 'Bahasa Melayu',
  it: 'Italiano', nl: 'Nederlands', pl: 'Polski', ur: 'اردو',
  bn: 'বাংলা', fa: 'فارسی', sv: 'Svenska', da: 'Dansk',
  no: 'Norsk', ro: 'Română', cs: 'Čeština', el: 'Ελληνικά',
  uk: 'Українська', hr: 'Hrvatski',
};
