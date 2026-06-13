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

export interface DbDrama {
  id: string;
  title: string;
  english_title: string | null;
  synopsis: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  genres: string[];
  tags: string[];
  cast: string[];
  director: string | null;
  age_rating: string;
  year: number;
  episode_length: string | null;
  total_episodes: number;
  is_original: boolean;
  is_new: boolean;
  is_exclusive: boolean;
  rating: number;
  views: number;
  created_at: string;
  updated_at: string;
}

export interface DbEpisode {
  id: string;
  drama_id: string;
  episode_number: number;
  title: string;
  duration: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  is_free: boolean;
  sort_order: number;
  views: number;
  created_at: string;
}
