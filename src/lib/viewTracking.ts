// ─────────────────────────────────────────────────────────────────────────
// 조회수 자동 집계 클라이언트 헬퍼
//
// episode 재생 "시작" 시점에 호출되어 DB의 record_episode_view() RPC를 통해
// episode_views 기록 + episodes.views / series.views 증가를 트리거한다.
// 동일 사용자가 일정 시간(서버 기본값 30분) 내 같은 episode를 재시청해도
// 중복 집계되지 않도록 viewer_id(로그인: user, 비로그인: 브라우저별 anon id)를
// 함께 전달한다. 실제 중복 판정은 DB RPC 안에서 수행된다.
// ─────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase';

const ANON_VIEWER_ID_KEY = 'framix_anon_viewer_id';

function createAnonId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // crypto.randomUUID 미지원 환경을 위한 폴백
  return `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// 로그인 사용자는 user_id, 비로그인 사용자는 localStorage에 저장된
// 브라우저별 고정 id를 viewer 식별자로 사용한다.
async function getViewerId(): Promise<string> {
  try {
    const { data } = await supabase.auth.getUser();
    const userId = data?.user?.id;
    if (userId) return `user:${userId}`;
  } catch {
    // 인증 조회 실패 시 익명 id로 폴백한다.
  }

  try {
    let anonId = localStorage.getItem(ANON_VIEWER_ID_KEY);
    if (!anonId) {
      anonId = createAnonId();
      localStorage.setItem(ANON_VIEWER_ID_KEY, anonId);
    }
    return `anon:${anonId}`;
  } catch {
    // localStorage 접근 불가(프라이빗 모드 등) 시 세션 한정 임시 id
    return `anon:${createAnonId()}`;
  }
}

/**
 * 에피소드 재생 시작 시 조회수를 기록한다.
 * @returns true  → 신규 조회로 집계됨
 *          false → 중복(dedupe 윈도우 내 재시청) 또는 오류로 집계되지 않음
 */
export async function recordEpisodeView(
  episodeId: string,
  seriesId: string
): Promise<boolean> {
  try {
    const viewerId = await getViewerId();
    const { data, error } = await supabase.rpc('record_episode_view', {
      p_episode_id: episodeId,
      p_series_id: seriesId,
      p_viewer_id: viewerId,
    });

    if (error) {
      console.error('[viewTracking] record_episode_view 실패:', error);
      return false;
    }
    return !!data;
  } catch (e) {
    console.error('[viewTracking] recordEpisodeView 예외:', e);
    return false;
  }
}
