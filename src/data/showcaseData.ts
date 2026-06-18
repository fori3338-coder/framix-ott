/**
 * SHOWCASE DATA — UI 전용 Mock 데이터
 * DB/Supabase와 완전 무관. 포스터/배너는 /public/content 로컬 이미지 사용.
 * 절대 수정 금지: useDramas.ts / useDramaDetail.ts / supabase.ts
 */
import type { Drama } from "../types";
import { posterImages, bannerImages } from "./localImages";

function makeEps(id: string, n: number): Drama["episodes"] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${id}-ep${i + 1}`,
    number: i + 1,
    title: `${i + 1}화`,
    duration: `${10 + (i % 5)}:${String((15 + i * 3) % 60).padStart(2, "0")}`,
    thumbnail: `/content/posters/${id.split("-")[1] ?? "poster01"}.png`,
    isFree: i < 3,
    progress: 0,
  }));
}

const SYNOPSES = [
  "재벌가의 비밀스러운 계약으로 시작된 위험한 사랑. 매 화 터지는 반전이 시청자를 사로잡는다.",
  "운명처럼 만난 두 사람, 하지만 그 뒤에 숨겨진 진실은 더욱 충격적이다.",
  "복수를 위해 접근했지만 사랑에 빠진 그녀. 되돌릴 수 없는 감정의 소용돌이.",
  "다시 돌아간 그날로부터 시작되는 두 번째 인생. 이번엔 절대 놓치지 않겠다.",
  "화려한 재벌가 며느리가 된 평범한 그녀. 달콤한 위장의 끝은 어디일까?",
  "냉혹한 CEO와 얽힌 계약결혼, 하지만 심장은 이미 규칙을 어기고 있었다.",
  "황제의 곁에 선 평민 신부. 궁중 음모와 사랑 사이에서 피어나는 생존기.",
  "쌍둥이 재벌가의 숨겨진 비밀. 피보다 진한 배신과 용서의 이야기.",
  "복수의 칼날을 가는 그녀, 그 앞에 나타난 남자는 적의 아들이었다.",
  "사랑한다는 말 한마디가 세상을 바꿀 수 있다면? 현대판 신데렐라 로맨스.",
];

function drama(
  idx: number,
  title: string,
  en: string,
  genres: string[],
  opts: Partial<Drama> = {}
): Drama {
  const id = `sc-${idx}`;
  const eps = 12 + (idx % 4) * 4;
  const posterIdx = idx % posterImages.length;
  const bannerIdx = idx % bannerImages.length;
  return {
    id,
    title,
    englishTitle: en,
    synopsis: SYNOPSES[idx % SYNOPSES.length],
    poster: posterImages[posterIdx],
    backdrop: bannerImages[bannerIdx],
    genres,
    tags: ["#사이다", "#반전", "#몰입"],
    rating: Math.round((7.2 + (idx * 0.13) % 2.4) * 10) / 10,
    ageRating: (["전체", "12+", "15+", "19+"] as const)[idx % 4],
    year: 2025,
    totalEpisodes: eps,
    episodeLength: "10-15분",
    cast: ["배우 A", "배우 B", "배우 C"],
    director: "김감독",
    isOriginal: idx < 5,
    isNew: idx % 3 === 0,
    isExclusive: idx % 5 === 0,
    views: 800000 + idx * 120000,
    episodes: makeEps(id, eps),
    ...opts,
  };
}

// ── TOP 10 ────────────────────────────────────────────────────────────────────
export const showcaseTop10: Drama[] = [
  drama(0, "재벌집 그녀의 계약", "Her Chaebol Contract", ["재벌", "로맨스", "계약결혼"]),
  drama(1, "복수의 여신", "Goddess of Revenge", ["복수", "스릴러", "서스펜스"]),
  drama(2, "황제의 신부", "The Emperor's Bride", ["황실", "로맨스", "운명"]),
  drama(3, "다시 만난 운명", "Fated Reunion", ["회귀", "로맨스", "운명"]),
  drama(4, "비서님의 비밀", "My Secretary's Secret", ["오피스", "로맨스", "비밀"]),
  drama(5, "쌍둥이 재벌가의 음모", "Twin Conspiracy", ["재벌", "음모", "서스펜스"]),
  drama(6, "이혼 후 첫사랑", "First Love After Divorce", ["로맨스", "재회", "성장"]),
  drama(7, "회장님의 숨겨진 딸", "Hidden Daughter", ["재벌", "가족", "반전"]),
  drama(8, "계약 신혼부부", "Contract Newlyweds", ["계약결혼", "로맨스", "코미디"]),
  drama(9, "사내 비밀 연애", "Office Secret Romance", ["오피스", "로맨스", "비밀"]),
];

// ── 새로운 에피소드 ────────────────────────────────────────────────────────────
export const showcaseNewEpisodes: Drama[] = [
  drama(10, "재회, 그리고 복수", "Reunion & Revenge", ["복수", "재회", "로맨스"], { isNew: true }),
  drama(11, "버려진 신부의 역습", "The Abandoned Bride Strikes Back", ["복수", "반전", "로맨스"], { isNew: true }),
  drama(2, "황제의 신부", "The Emperor's Bride", ["황실", "로맨스", "운명"], { isNew: true }),
  drama(12, "도련님의 사랑법", "Young Master's Love", ["재벌", "로맨스", "성장"], { isNew: true }),
  drama(13, "타임루프 신혼일기", "Time Loop Honeymoon", ["회귀", "로맨스", "코미디"], { isNew: true }),
  drama(14, "재벌 3세는 처음이라", "First Time Chaebol", ["재벌", "로맨스", "코미디"], { isNew: true }),
  drama(15, "절대 갑, 절대 을", "Absolute Power", ["오피스", "로맨스", "서스펜스"], { isNew: true }),
  drama(16, "그 남자의 정체", "His True Identity", ["미스터리", "로맨스", "반전"], { isNew: true }),
];

// ── 당신을 위한 추천 ────────────────────────────────────────────────────────────
export const showcaseRecommended: Drama[] = [
  drama(3, "다시 만난 운명", "Fated Reunion", ["회귀", "로맨스", "운명"]),
  drama(7, "회장님의 숨겨진 딸", "Hidden Daughter", ["재벌", "가족", "반전"]),
  drama(11, "버려진 신부의 역습", "Abandoned Bride", ["복수", "반전", "로맨스"]),
  drama(1, "복수의 여신", "Goddess of Revenge", ["복수", "스릴러", "서스펜스"]),
  drama(17, "엄마는 재벌이었다", "Mom Was a Chaebol", ["가족", "재벌", "반전"]),
  drama(18, "위장 결혼 24시", "24 Hours Fake Marriage", ["계약결혼", "로맨스", "코미디"]),
  drama(9, "사내 비밀 연애", "Office Secret Romance", ["오피스", "로맨스", "비밀"]),
  drama(4, "비서님의 비밀", "My Secretary's Secret", ["오피스", "로맨스", "비밀"]),
];

// ── 로맨스 판타지 ────────────────────────────────────────────────────────────────
export const showcaseRomance: Drama[] = [
  drama(2, "황제의 신부", "The Emperor's Bride", ["황실", "로맨스", "운명"]),
  drama(8, "계약 신혼부부", "Contract Newlyweds", ["계약결혼", "로맨스", "코미디"]),
  drama(6, "이혼 후 첫사랑", "First Love After Divorce", ["로맨스", "재회", "성장"]),
  drama(13, "타임루프 신혼일기", "Time Loop Honeymoon", ["회귀", "로맨스", "코미디"]),
  drama(18, "위장 결혼 24시", "24 Hours Fake Marriage", ["계약결혼", "로맨스", "코미디"]),
  drama(0, "재벌집 그녀의 계약", "Her Chaebol Contract", ["재벌", "로맨스", "계약결혼"]),
  drama(14, "재벌 3세는 처음이라", "First Time Chaebol", ["재벌", "로맨스", "코미디"]),
  drama(3, "다시 만난 운명", "Fated Reunion", ["회귀", "로맨스", "운명"]),
];

// ── 재벌 / 복수 ──────────────────────────────────────────────────────────────
export const showcaseRevenge: Drama[] = [
  drama(1, "복수의 여신", "Goddess of Revenge", ["복수", "스릴러", "서스펜스"]),
  drama(5, "쌍둥이 재벌가의 음모", "Twin Conspiracy", ["재벌", "음모", "서스펜스"]),
  drama(10, "재회, 그리고 복수", "Reunion & Revenge", ["복수", "재회", "로맨스"]),
  drama(11, "버려진 신부의 역습", "Abandoned Bride", ["복수", "반전", "로맨스"]),
  drama(7, "회장님의 숨겨진 딸", "Hidden Daughter", ["재벌", "가족", "반전"]),
  drama(0, "재벌집 그녀의 계약", "Her Chaebol Contract", ["재벌", "로맨스", "계약결혼"]),
  drama(15, "절대 갑, 절대 을", "Absolute Power", ["오피스", "로맨스", "서스펜스"]),
  drama(17, "엄마는 재벌이었다", "Mom Was a Chaebol", ["가족", "재벌", "반전"]),
];

// ── FRAMIX 오리지널 ──────────────────────────────────────────────────────────────
export const showcaseOriginals: Drama[] = [
  drama(0, "재벌집 그녀의 계약", "Her Chaebol Contract", ["재벌", "로맨스", "계약결혼"], { isOriginal: true, isExclusive: true }),
  drama(1, "복수의 여신", "Goddess of Revenge", ["복수", "스릴러", "서스펜스"], { isOriginal: true }),
  drama(2, "황제의 신부", "The Emperor's Bride", ["황실", "로맨스", "운명"], { isOriginal: true, isExclusive: true }),
  drama(3, "다시 만난 운명", "Fated Reunion", ["회귀", "로맨스", "운명"], { isOriginal: true }),
  drama(4, "비서님의 비밀", "My Secretary's Secret", ["오피스", "로맨스", "비밀"], { isOriginal: true, isExclusive: true }),
  drama(19, "그 남자의 정체", "His True Identity", ["미스터리", "로맨스", "반전"], { isOriginal: true }),
  drama(16, "그 남자의 정체2", "His True Identity 2", ["미스터리", "로맨스", "반전"], { isOriginal: true }),
];
