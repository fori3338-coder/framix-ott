/**
 * 번역 제공자: Gemini Free Tier (1차) → OpenRouter (실패/한도 초과 시 폴백)
 * 두 제공자 모두 "JSON 배열만 반환" 프롬프트 규칙을 동일하게 사용해
 * 파싱 로직을 공유한다.
 */

import { LANG_NAMES } from './langs.ts';
import { parseVtt, buildVtt, type VttCue } from './vtt.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') ?? '';
const OPENROUTER_MODEL = Deno.env.get('OPENROUTER_MODEL') ?? 'google/gemini-2.0-flash-exp:free';

// Gemini 무료 등급 모델 (요청 시점 기준 가장 안정적인 free-tier 모델)
const GEMINI_MODEL = 'gemini-2.0-flash';

export type TranslateProvider = 'gemini' | 'openrouter';

export interface TranslateResult {
  vtt: string;
  provider: TranslateProvider;
}

function buildPrompt(texts: string[], langName: string, targetLang: string): {
  system: string;
  user: string;
} {
  const system =
    `You are a professional subtitle translator specializing in Korean short-form drama.
Translate the provided Korean subtitle texts into ${langName} (${targetLang}).
Rules:
- Return ONLY a valid JSON array of translated strings, in the same order as input.
- Preserve line breaks (\\n) within each subtitle.
- Keep subtitle text natural and concise for on-screen display.
- Do NOT add explanations, markdown, or any other text outside the JSON array.`;
  const user = `Translate these ${texts.length} Korean subtitle texts into ${langName}:\n${JSON.stringify(texts)}`;
  return { system, user };
}

function extractJsonArray(raw: string, fallback: string[]): string[] {
  // 코드펜스 제거 (모델이 ```json ... ``` 으로 감싸는 경우 방지)
  const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  try {
    const parsed = JSON.parse(cleaned) as unknown;
    if (Array.isArray(parsed)) return parsed as string[];
    if (parsed && typeof parsed === 'object' && 'translations' in parsed) {
      return (parsed as { translations: string[] }).translations;
    }
    const values = Object.values(parsed as Record<string, unknown>);
    const arr = values.find(Array.isArray);
    return (arr as string[]) ?? fallback;
  } catch {
    return fallback;
  }
}

async function translateWithGemini(texts: string[], langName: string, targetLang: string): Promise<string[]> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY 미설정');

  const { system, user } = buildPrompt(texts, langName, targetLang);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${system}\n\n${user}` }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini 번역 실패 (${res.status}): ${err.slice(0, 300)}`);
  }

  const json = await res.json() as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
  return extractJsonArray(raw, texts);
}

async function translateWithOpenRouter(texts: string[], langName: string, targetLang: string): Promise<string[]> {
  if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY 미설정');

  const { system, user } = buildPrompt(texts, langName, targetLang);

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://framix.app',
      'X-Title': 'FRAMIX Subtitle Pipeline',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter 번역 실패 (${res.status}): ${err.slice(0, 300)}`);
  }

  const json = await res.json() as { choices: { message: { content: string } }[] };
  const raw = json.choices[0]?.message?.content ?? '[]';
  return extractJsonArray(raw, texts);
}

/**
 * VTT 번역: Gemini 우선 시도 → 실패(한도초과/오류) 시 OpenRouter로 자동 폴백.
 * 두 제공자 모두 실패하면 에러를 throw (호출부에서 재시도/스킵 결정).
 */
export async function translateVtt(
  koVtt: string,
  targetLang: string,
): Promise<TranslateResult> {
  const cues = parseVtt(koVtt);
  if (cues.length === 0) return { vtt: koVtt, provider: 'gemini' };

  const langName = LANG_NAMES[targetLang] ?? targetLang;
  const texts = cues.map((c) => c.text);

  let translated: string[] | null = null;
  let provider: TranslateProvider;

  try {
    translated = await translateWithGemini(texts, langName, targetLang);
    provider = 'gemini';
  } catch (geminiErr) {
    console.warn(`[translateVtt] Gemini 실패 (${targetLang}), OpenRouter 폴백:`, (geminiErr as Error).message);
    translated = await translateWithOpenRouter(texts, langName, targetLang);
    provider = 'openrouter';
  }

  if (!translated || translated.length !== cues.length) {
    console.warn(`[translateVtt] ${targetLang} 번역 수량 불일치, 원문 fallback`);
    translated = texts;
  }

  const translatedCues: VttCue[] = cues.map((c, i) => ({ ...c, text: translated![i] ?? c.text }));
  return { vtt: buildVtt(translatedCues), provider };
}
