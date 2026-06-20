/**
 * VTT 파서 / 빌더
 * 기존 src/lib/subtitlePipeline.ts의 로직을 Deno Edge Function용으로 포팅.
 * WEBVTT 구조 100% 동일 유지 (요구사항: 기존 자막 구조 변경 금지).
 */

export interface VttCue {
  index: number;
  timestamp: string; // "00:00:01.000 --> 00:00:03.000"
  text: string;
}

export function parseVtt(vttText: string): VttCue[] {
  const lines = vttText.replace(/\r\n/g, '\n').split('\n');
  const cues: VttCue[] = [];
  let i = 0;
  while (i < lines.length && !lines[i].includes('-->')) i++;

  let index = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.includes('-->')) {
      const timestamp = line;
      const textLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== '') {
        textLines.push(lines[i]);
        i++;
      }
      cues.push({ index: ++index, timestamp, text: textLines.join('\n') });
    }
    i++;
  }
  return cues;
}

export function buildVtt(cues: VttCue[]): string {
  const body = cues
    .map((c) => `${c.index}\n${c.timestamp}\n${c.text}`)
    .join('\n\n');
  return `WEBVTT\n\n${body}\n`;
}
