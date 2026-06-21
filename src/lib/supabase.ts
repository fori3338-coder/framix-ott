import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL 또는 VITE_SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다.\n' +
    '로컬 개발: .env.local 파일을 생성하세요.\n' +
    '배포: Cloudflare Pages 환경변수에 추가하세요.'
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');

// ─── Database 타입 정의 ───────────────────────────────────────────────────────
// series 테이블 (001_init.sql 기준)
export interface DbDrama {
  id: string;
  title: string;
  english_title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  backdrop_url: string | null;
  genres: string[] | null;
  tags: string[] | null;
  genre: string | null;        // 하위 호환 (실제 컬럼: genres[])
  age_rating: string | null;
  rating: number;
  total_episodes: number;
  is_original: boolean | null;
  is_exclusive: boolean | null;
  is_new: boolean | null;
  views: number | null;
  status: string | null;
  banner_enabled: boolean | null;
  banner_order: number | null;
  top10_rank: number | null;
}

// episodes 테이블 (001_init.sql 기준)
// ★ 존재하는 컬럼: id, series_id, episode_number, title, duration,
//                   thumbnail_url, video_url, is_free, sort_order, views, created_at
// ★ 존재하지 않는 컬럼: description, duration_seconds, membership_level
export interface DbEpisode {
  id: string;
  series_id: string;
  episode_number: number;
  title: string;
  duration: string | null;       // '12:00' 형식 text
  thumbnail_url: string | null;
  video_url: string | null;
  is_free: boolean | null;
  sort_order: number | null;
  views: number | null;
  created_at: string | null;
  subtitles: Record<string, string> | null; // { "ko": "url", "en": "url", ... }
  focal_x?: number | null; // 영상 피사체 중심 X좌표(%), 016 마이그레이션. 없으면 50
  focal_y?: number | null; // 영상 피사체 중심 Y좌표(%), 016 마이그레이션. 없으면 33(인물 얼굴 근사)
}

// 017 마이그레이션: episode_focus_points (구간별 Dynamic Reframe)
export interface DbEpisodeFocusPoint {
  id: string;
  episode_id: string;
  start_time: number;
  end_time: number;
  focal_x: number;
  focal_y: number;
  created_at?: string | null;
}
