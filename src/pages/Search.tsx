/**
 * Search.tsx — FRAMIX Netflix-level Search Experience v2
 *
 * 변경 사항:
 *  - 실시간 필터링 (제목 / 장르 / 태그 통합 검색)
 *  - 최근 검색어 (최대 10개, localStorage)
 *  - 인기 검색어 영역 (랭킹 UI)
 *  - 검색창 포커스 시 히스토리 오버레이
 *  - 검색 결과 없음 → 추천 작품 표시
 *  - 모바일 전체화면 Search Overlay
 *  - 장르 칩 필터 (실시간)
 *  - 자동완성 드롭다운 (포스터 + 장르 표시)
 */

import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search as SearchIcon,
  X,
  TrendingUp,
  Clock,
  Sparkles,
  Tag,
  ChevronRight,
} from "lucide-react";
import { dramas as mockDramas } from "../data/mockData";
import { showcaseTop10, showcaseNewEpisodes, showcaseRomance, showcaseRevenge } from "../data/showcaseData";
import { useDramas } from "../hooks/useDramas";
import DramaCard from "../components/DramaCard";
import type { Drama } from "../types";

// ── 상수 ──────────────────────────────────────────────────────────────────
const RECENT_KEY = "framix:recent-searches-v2";
const MAX_RECENT = 10;

const TRENDING_KEYWORDS = [
  "재벌집", "복수", "회귀", "계약결혼",
  "오피스 로맨스", "쌍둥이", "황제", "타임루프",
  "신데렐라", "사이다 반전",
];

// ── 로컬 스토리지 유틸 ──────────────────────────────────────────────────
function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {}
}

// ── 빈 결과 시 추천 섹션 ──────────────────────────────────────────────────
function EmptyResult({ query, recommendations }: { query: string; recommendations: Drama[] }) {
  return (
    <div className="animate-fade-in">
      <div className="text-center py-10">
        <div className="w-14 h-14 rounded-full bg-surface-2 flex items-center justify-center mx-auto mb-4">
          <SearchIcon size={24} className="text-text-muted" />
        </div>
        <p className="text-text-dim font-medium mb-1">
          "<span className="text-gold">{query}</span>" 검색 결과가 없습니다
        </p>
        <p className="text-text-muted text-sm">다른 키워드로 검색하거나 장르 필터를 사용해보세요.</p>
      </div>

      {recommendations.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-text-dim mb-3 flex items-center gap-2">
            <Sparkles size={14} className="text-gold" />
            이런 작품은 어떠세요?
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {recommendations.slice(0, 8).map((d, i) => (
              <div
                key={d.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${i * 40}ms`, animationFillMode: "backwards" }}
              >
                <DramaCard drama={d} size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 인기 검색어 랭킹 ─────────────────────────────────────────────────────
function TrendingSection({ onSelect }: { onSelect: (k: string) => void }) {
  return (
    <section>
      <h3 className="text-xs font-semibold text-text-muted mb-3 flex items-center gap-1.5 uppercase tracking-wider">
        <TrendingUp size={13} className="text-gold" />
        지금 인기 검색어
      </h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
        {TRENDING_KEYWORDS.map((k, i) => (
          <button
            key={k}
            onMouseDown={(e) => { e.preventDefault(); onSelect(k); }}
            className="flex items-center gap-3 py-2 text-left group hover:bg-surface-2/60 rounded-lg px-2 -mx-2 transition-colors"
          >
            <span
              className={`text-sm font-bold w-5 shrink-0 tabular-nums ${
                i < 3
                  ? "text-gold"
                  : i < 5
                  ? "text-gold/60"
                  : "text-text-muted"
              }`}
            >
              {i + 1}
            </span>
            <span className="text-sm text-text group-hover:text-gold transition-colors truncate">
              {k}
            </span>
            {i < 3 && (
              <span className="text-[10px] text-gold/70 font-semibold ml-auto shrink-0">
                HOT
              </span>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}

// ── 최근 검색어 ──────────────────────────────────────────────────────────
function RecentSection({
  recent,
  onSelect,
  onRemove,
  onClear,
}: {
  recent: string[];
  onSelect: (k: string) => void;
  onRemove: (k: string) => void;
  onClear: () => void;
}) {
  if (recent.length === 0) return null;
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-text-muted flex items-center gap-1.5 uppercase tracking-wider">
          <Clock size={13} className="text-gold" />
          최근 검색어
        </h3>
        <button
          onMouseDown={(e) => { e.preventDefault(); onClear(); }}
          className="text-xs text-text-muted hover:text-gold transition-colors"
        >
          전체 삭제
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {recent.map((r) => (
          <div key={r} className="flex items-center gap-1 bg-surface-2 border border-border rounded-full pr-1 pl-3 py-1.5 group">
            <button
              onMouseDown={(e) => { e.preventDefault(); onSelect(r); }}
              className="text-xs text-text hover:text-gold transition-colors"
            >
              {r}
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); onRemove(r); }}
              className="w-4 h-4 rounded-full bg-surface-3 hover:bg-gold/20 flex items-center justify-center text-text-muted hover:text-gold transition-colors ml-0.5"
              aria-label="삭제"
            >
              <X size={10} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────
export default function Search() {
  const { dramas: dbDramas } = useDramas();
  const inputRef = useRef<HTMLInputElement>(null);

  // 전체 드라마 풀 (DB + mockData + showcaseData 병합, 중복 제거)
  const allDramas = useMemo(() => {
    const showcase = [
      ...showcaseTop10,
      ...showcaseNewEpisodes,
      ...showcaseRomance,
      ...showcaseRevenge,
    ];
    const dbIds = new Set(dbDramas.map((d) => d.id));
    const merged = [...dbDramas, ...mockDramas.filter((d) => !dbIds.has(d.id))];
    const mergedIds = new Set(merged.map((d) => d.id));
    const withShowcase = [...merged, ...showcase.filter((d) => !mergedIds.has(d.id))];
    // 최종 중복 제거
    const seen = new Set<string>();
    return withShowcase.filter((d) => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });
  }, [dbDramas]);

  const allGenres = useMemo(
    () => Array.from(new Set(allDramas.flatMap((d) => d.genres))).sort(),
    [allDramas]
  );

  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState<string[]>(loadRecent);

  const cat = params.get("cat");

  // URL 동기화 (debounce)
  useEffect(() => {
    const t = setTimeout(() => {
      setParams(
        (p: URLSearchParams) => {
          const next = new URLSearchParams(p);
          if (query) next.set("q", query);
          else next.delete("q");
          return next;
        },
        { replace: true }
      );
    }, 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const trimmed = query.trim().toLowerCase();

  // 자동완성 제안 (최대 6개)
  const suggestions = useMemo(() => {
    if (!trimmed) return [];
    return allDramas
      .filter(
        (d) =>
          d.title.toLowerCase().includes(trimmed) ||
          d.englishTitle?.toLowerCase().includes(trimmed) ||
          d.genres.some((g) => g.toLowerCase().includes(trimmed)) ||
          d.tags?.some((t) => t.toLowerCase().includes(trimmed))
      )
      .slice(0, 6);
  }, [trimmed, allDramas]);

  // 검색 결과
  const results = useMemo(() => {
    let list = [...allDramas];
    if (cat === "trending") list = list.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    else if (cat === "new") list = list.filter((d) => d.isNew);
    if (activeGenre) list = list.filter((d) => d.genres.includes(activeGenre));
    if (trimmed) {
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(trimmed) ||
          d.englishTitle?.toLowerCase().includes(trimmed) ||
          d.genres.some((g) => g.toLowerCase().includes(trimmed)) ||
          d.tags?.some((t) => t.toLowerCase().includes(trimmed))
      );
    }
    return list;
  }, [trimmed, activeGenre, cat, allDramas]);

  // 빈 결과 시 추천 작품 (조회수 상위)
  const emptyRecommendations = useMemo(
    () =>
      [...allDramas]
        .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
        .slice(0, 8),
    [allDramas]
  );

  // 최근 검색어 관리
  function commitRecent(term: string) {
    const t = term.trim();
    if (!t) return;
    const next = [t, ...recent.filter((r) => r !== t)].slice(0, MAX_RECENT);
    setRecent(next);
    saveRecent(next);
  }

  function removeRecent(term: string) {
    const next = recent.filter((r) => r !== term);
    setRecent(next);
    saveRecent(next);
  }

  function clearRecent() {
    setRecent([]);
    try { localStorage.removeItem(RECENT_KEY); } catch {}
  }

  function selectKeyword(k: string) {
    setQuery(k);
    commitRecent(k);
    setFocused(false);
    inputRef.current?.blur();
  }

  const showHistoryOverlay = focused && !trimmed;
  const showSuggestions = focused && trimmed && suggestions.length > 0;
  const showContent = !showHistoryOverlay;

  return (
    <div className="min-h-screen px-4 md:px-8 pt-20 md:pt-24 pb-20 md:pb-10 animate-fade-in">
      {/* ── Sticky Search Bar ─────────────────────────────────────────── */}
      <div className="sticky top-16 md:top-20 z-30 -mx-4 md:-mx-8 px-4 md:px-8 py-3 bg-base/90 backdrop-blur-md">
        <div className="relative max-w-2xl mx-auto md:mx-0">
          <SearchIcon
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gold pointer-events-none"
          />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commitRecent(query);
                setFocused(false);
                inputRef.current?.blur();
              }
              if (e.key === "Escape") {
                setQuery("");
                setParams({});
                setFocused(false);
              }
            }}
            placeholder="작품, 장르, 키워드 검색"
            className="w-full bg-surface-2 border border-border focus:border-gold rounded-xl pl-10 pr-10 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-gold/30 transition-all"
          />
          {query && (
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setQuery("");
                setParams({});
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface-3 hover:bg-gold/20 flex items-center justify-center text-text-muted transition-colors"
              aria-label="검색어 지우기"
            >
              <X size={12} />
            </button>
          )}

          {/* ── 자동완성 드롭다운 ───────────────────────────────────────── */}
          {showSuggestions && (
            <div className="absolute left-0 right-0 mt-2 bg-surface border border-border rounded-xl shadow-2xl shadow-black/70 overflow-hidden animate-scale-in origin-top z-50">
              {suggestions.map((d) => (
                <Link
                  key={d.id}
                  to={`/drama/${d.id}`}
                  onMouseDown={() => commitRecent(d.title)}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-2 transition-colors border-b border-border/40 last:border-b-0"
                >
                  <img
                    src={d.poster}
                    alt=""
                    className="w-9 h-12 object-cover rounded-md shrink-0 bg-surface-2"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">{d.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xs text-text-muted truncate">
                        {d.genres.slice(0, 3).join(" · ")}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-text-muted shrink-0" />
                </Link>
              ))}
              {/* 전체 결과 보기 */}
              <button
                onMouseDown={() => { commitRecent(query); setFocused(false); }}
                className="w-full flex items-center justify-between px-4 py-3 text-xs text-text-muted hover:text-gold bg-surface-2/50 hover:bg-surface-2 transition-colors"
              >
                <span>
                  "<span className="text-gold font-medium">{query}</span>" 전체 결과 보기
                </span>
                <SearchIcon size={12} />
              </button>
            </div>
          )}

          {/* ── 모바일 히스토리 오버레이 ─────────────────────────────────── */}
          {showHistoryOverlay && !cat && (
            <div className="absolute left-0 right-0 mt-2 bg-surface border border-border rounded-xl shadow-2xl shadow-black/70 overflow-hidden animate-scale-in origin-top z-50 md:hidden">
              <div className="p-4 space-y-5 max-h-[60vh] overflow-y-auto">
                <RecentSection
                  recent={recent}
                  onSelect={selectKeyword}
                  onRemove={removeRecent}
                  onClear={clearRecent}
                />
                <TrendingSection onSelect={selectKeyword} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 데스크탑: 검색 히스토리 인라인 영역 ──────────────────────────── */}
      {showHistoryOverlay && !cat && (
        <div className="hidden md:block mt-6 space-y-6 animate-fade-in max-w-2xl">
          <RecentSection
            recent={recent}
            onSelect={selectKeyword}
            onRemove={removeRecent}
            onClear={clearRecent}
          />
          <TrendingSection onSelect={selectKeyword} />
        </div>
      )}

      {/* ── 장르 칩 필터 ──────────────────────────────────────────────────── */}
      {showContent && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide my-4 pb-1">
          <button
            onClick={() => setActiveGenre(null)}
            className={`shrink-0 text-xs md:text-sm px-3.5 py-1.5 rounded-full border transition-all duration-200 ${
              activeGenre === null
                ? "bg-gradient-gold text-black border-gold font-semibold shadow-[0_2px_12px_-2px_rgba(212,175,55,0.6)]"
                : "border-border text-text-muted hover:border-gold/50 hover:text-gold"
            }`}
          >
            전체
          </button>
          {allGenres.map((g) => (
            <button
              key={g}
              onClick={() => setActiveGenre(activeGenre === g ? null : g)}
              className={`shrink-0 text-xs md:text-sm px-3.5 py-1.5 rounded-full border transition-all duration-200 flex items-center gap-1 ${
                activeGenre === g
                  ? "bg-gradient-gold text-black border-gold font-semibold shadow-[0_2px_12px_-2px_rgba(212,175,55,0.6)]"
                  : "border-border text-text-muted hover:border-gold/50 hover:text-gold"
              }`}
            >
              {activeGenre === g && <Tag size={11} />}
              {g}
            </button>
          ))}
        </div>
      )}

      {/* ── 카테고리 헤더 ─────────────────────────────────────────────────── */}
      {showContent && cat === "trending" && !query && (
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <TrendingUp size={18} className="text-gold" />
          <span className="text-gradient-gold">트렌딩 드라마</span>
        </h2>
      )}
      {showContent && cat === "new" && !query && (
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Sparkles size={18} className="text-gold" />
          <span className="text-gradient-gold">신작 드라마</span>
        </h2>
      )}

      {/* ── 결과 카운트 ─────────────────────────────────────────────────── */}
      {showContent && (trimmed || activeGenre) && results.length > 0 && (
        <p className="text-xs text-text-muted mb-3">
          <span className="text-gold font-semibold">{results.length}</span>개 결과
          {trimmed && (
            <>
              {" "}· "<span className="text-text">{query}</span>"
            </>
          )}
          {activeGenre && (
            <>
              {" "}· <span className="text-gold">{activeGenre}</span>
            </>
          )}
        </p>
      )}

      {/* ── 결과 그리드 ─────────────────────────────────────────────────── */}
      {showContent && results.length === 0 && (trimmed || activeGenre) ? (
        <EmptyResult query={query || activeGenre || ""} recommendations={emptyRecommendations} />
      ) : showContent && results.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-4">
          {results.map((d, i) => (
            <div
              key={d.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${Math.min(i, 16) * 25}ms`, animationFillMode: "backwards" }}
            >
              <DramaCard drama={d} size="sm" />
            </div>
          ))}
        </div>
      ) : showContent && !trimmed && !activeGenre && !cat ? (
        /* 검색어 없음 + 필터 없음 = 전체 드라마 그리드 (기본 탐색) */
        <div>
          <p className="text-xs text-text-muted mb-3">
            전체 <span className="text-gold font-semibold">{allDramas.length}</span>개 작품
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-4">
            {allDramas.map((d, i) => (
              <div
                key={d.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${Math.min(i, 16) * 20}ms`, animationFillMode: "backwards" }}
              >
                <DramaCard drama={d} size="sm" />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
