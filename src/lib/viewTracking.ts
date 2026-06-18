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
  console.log('[viewTracking] recordEpisodeView() 호출됨', { episodeId, seriesId });

  try {
    const viewerId = await getViewerId();
    console.log('[viewTracking] viewerId =', viewerId);

    const rpcParams = {
      p_episode_id: episodeId,
      p_series_id: seriesId,
      p_viewer_id: viewerId,
    };
    console.log('[viewTracking] supabase.rpc("record_episode_view") 호출, params =', rpcParams);

    const { data, error } = await supabase.rpc('record_episode_view', rpcParams);

    console.log('[viewTracking] RPC 응답:', { data, error });

    if (!error) {
      console.log('[viewTracking] RPC 성공, 집계 결과 =', data);
      return !!data;
    }

    // RPC 자체가 실패한 경우(예: PostgREST 스키마 캐시 미반영으로 함수를 찾지 못함,
    // 네트워크 오류 등) — 동일한 결과를 클라이언트에서 직접 재현하는 폴백 경로로 전환한다.
    console.error('[viewTracking] record_episode_view RPC 실패, 직접 기록 폴백 시도:', error);
    return await fallbackDirectRecord(episodeId, seriesId, viewerId);
  } catch (e) {
    console.error('[viewTracking] recordEpisodeView 예외:', e);
    return false;
  }
}

// ─── RPC 실패 시 폴백: 클라이언트에서 직접 dedupe 확인 → insert → views 증가 ─────
// record_episode_view() RPC가 어떤 이유로든 호출되지 않거나 실패할 경우를 대비한
// 안전망. 정상 배포 상태에서는 RPC 경로만 사용되고 이 함수는 호출되지 않는다.
async function fallbackDirectRecord(
  episodeId: string,
  seriesId: string,
  viewerId: string
): Promise<boolean> {
  const DEDUPE_WINDOW_MS = 30 * 60 * 1000; // RPC 기본값(30분)과 동일
  const sinceIso = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();

  try {
    const { data: existing, error: checkError } = await supabase
      .from('episode_views')
      .select('id')
      .eq('episode_id', episodeId)
      .eq('viewer_id', viewerId)
      .gte('viewed_at', sinceIso)
      .limit(1);

    console.log('[viewTracking][fallback] 중복 조회 확인:', { existing, checkError });

    if (checkError) {
      console.error('[viewTracking][fallback] 중복 확인 쿼리 실패:', checkError);
      return false;
    }
    if (existing && existing.length > 0) {
      console.log('[viewTracking][fallback] 최근 동일 viewer 조회 기록 존재 → 집계 생략');
      return false;
    }

    const { error: insertError } = await supabase
      .from('episode_views')
      .insert({ episode_id: episodeId, series_id: seriesId, viewer_id: viewerId });

    console.log('[viewTracking][fallback] episode_views insert 결과:', { insertError });

    if (insertError) {
      console.error('[viewTracking][fallback] episode_views insert 실패:', insertError);
      return false;
    }

    // series.views 증가: 기존(이미 검증된) increment_series_views RPC 재사용
    const { error: seriesIncError } = await supabase.rpc('increment_series_views', {
      series_id: seriesId,
    });
    if (seriesIncError) {
      console.error('[viewTracking][fallback] series.views 증가 실패:', seriesIncError);
    }

    // episodes.views 증가 (read → +1 → update)
    const { data: epRow, error: epReadError } = await supabase
      .from('episodes')
      .select('views')
      .eq('id', episodeId)
      .single();
    if (!epReadError && epRow) {
      const { error: epUpdateError } = await supabase
        .from('episodes')
        .update({ views: (epRow.views ?? 0) + 1 })
        .eq('id', episodeId);
      if (epUpdateError) {
        console.error('[viewTracking][fallback] episodes.views 증가 실패:', epUpdateError);
      }
    }

    console.log('[viewTracking][fallback] 직접 기록 완료');
    return true;
  } catch (e) {
    console.error('[viewTracking][fallback] 예외:', e);
    return false;
  }
}
