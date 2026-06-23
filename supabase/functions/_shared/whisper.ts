/**
 * Groq Whisper STT
 * ────────────────
 * OpenAI 호환 엔드포인트를 제공하는 Groq의 호스팅 Whisper API 사용.
 * (Faster-Whisper는 Deno Edge Function 환경에서 직접 실행 불가능한
 *  로컬 추론 라이브러리이므로, 동등한 호스팅 Whisper 서비스로 대체)
 */

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') ?? '';
const GROQ_WHISPER_MODEL = Deno.env.get('GROQ_WHISPER_MODEL') ?? 'whisper-large-v3-turbo';

export async function transcribeWithGroqWhisper(
  videoBlob: Blob,
  fileName: string,
): Promise<string> {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY 미설정');

  const formData = new FormData();
  formData.append('file', videoBlob, fileName);
  formData.append('model', GROQ_WHISPER_MODEL);
  formData.append('response_format', 'vtt');
  formData.append('language', 'ko');

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq Whisper STT 실패 (${res.status}): ${err.slice(0, 300)}`);
  }

  const vttText = await res.text();
  if (!vttText.includes('WEBVTT')) {
    throw new Error('Groq Whisper 응답이 VTT 형식이 아닙니다.');
  }
  return vttText;
}
