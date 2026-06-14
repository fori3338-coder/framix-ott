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
  description: string | null;
  thumbnail_url: string | null;
  backdrop_url: string | null;
  genre: string | null;
  age_rating: string | null;
  rating: number;
  total_episodes: number;
  status: string | null;
}

export interface DbEpisode {
  id: string;
  series_id: string;
  episode_number: number;
  title: string;
  description: string | null;
  duration: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  is_free: boolean | null;
}
