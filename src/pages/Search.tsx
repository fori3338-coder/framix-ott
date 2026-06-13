import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search as SearchIcon, X, TrendingUp, Clock, Sparkles } from "lucide-react";
import { dramas } from "../data/mockData";
import DramaCard from "../components/DramaCard";

const allGenres = Array.from(new Set(dramas.flatMap((d) => d.genres)));
const RECENT_KEY = "framix:recent-searches";

const trendingKeywords = [
  "재벌집", "복수", "회귀", "계약결혼", "오피스", "쌍둥이", "운명", "황제",
];

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); } catch { return []; }
}

export default function Search() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [prevCat, setPrevCat] = useState(params.get("cat"));
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState<string[]>(loadRecent);

  const cat = params.get("cat");

  if (cat !== prevCat) {
    setPrevCat(cat);
    if (cat === "trending" || cat === "new") setActiveGenre(null);
  }

  // Debounced URL sync (real-time feel without spamming history)
  useEffect(() => {
    const t = setTimeout(() => {
      setParams((p) => {
        const next = new URLSearchParams(p);
        if (query) next.set("q", query);
        else next.delete("q");
        return next;
      }, { replace: true });
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const trimmed = query.trim().toLowerCase();

  const suggestions = useMemo(() => {
    if (!trimmed) return [];
    return dramas
      .filter(
        (d) =>
          d.title.toLowerCase().includes(trimmed) ||
          d.englishTitle?.toLowerCase().includes(trimmed)
      )
      .slice(0, 6);
  }, [trimmed]);

  const results = useMemo(() => {
    let list = [...dramas];
    if (cat === "trending") list = list.sort((a, b) => b.views - a.views);
    else if (cat === "new") list = list.filter((d) => d.isNew);
    if (activeGenre) list = list.filter((d) => d.genres.includes(activeGenre));
    if (trimmed) {
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(trimmed) ||
          d.englishTitle?.toLowerCase().includes(trimmed) ||
          d.genres.some((g) => g.toLowerCase().includes(trimmed))
      );
    }
    return list;
  }, [trimmed, activeGenre, cat]);

  function commitRecent(term: string) {
    const t = term.trim();
    if (!t) return;
    const next = [t, ...recent.filter((r) => r !== t)].slice(0, 8);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
  }

  function clearRecent() {
    setRecent([]);
    try { localStorage.removeItem(RECENT_KEY); } catch {}
  }

  const showOverlay = focused && !trimmed;
  const showSuggestions = focused && trimmed && suggestions.length > 0;

  return (
    <div className="px-4 md:px-8 pt-20 md:pt-24 pb-10 animate-fade-in">
      {/* Sticky search bar */}
      <div className="sticky top-16 md:top-20 z-30 -mx-4 md:-mx-8 px-4 md:px-8 py-3 bg-base/85 backdrop-blur-md">
        <div className="relative">
          <SearchIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gold pointer-events-none" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            onKeyDown={(e) => { if (e.key === "Enter") commitRecent(query); }}
            placeholder="작품, 장르, 키워드 검색"
            className="w-full bg-surface-2 border border-border focus:border-gold rounded-xl pl-10 pr-10 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-gold/30 transition-all"
          />
          {query && (
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setQuery(""); setParams({}); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface-3 hover:bg-gold/20 flex items-center justify-center text-text-dim transition-colors"
              aria-label="검색어 지우기"
            >
              <X size={14} />
            </button>
          )}

          {/* Live suggestions dropdown */}
          {showSuggestions && (
            <div className="absolute left-0 right-0 mt-2 bg-surface-2 border border-border rounded-xl shadow-2xl shadow-black/60 overflow-hidden animate-scale-in origin-top z-40">
              {suggestions.map((d) => (
                <Link
                  key={d.id}
                  to={`/drama/${d.id}`}
                  onMouseDown={() => commitRecent(d.title)}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-3 transition-colors border-b border-border/50 last:border-b-0"
                >
                  <img src={d.poster} alt="" className="w-9 h-12 object-cover rounded-md shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">{d.title}</p>
                    <p className="text-xs text-text-muted truncate">{d.genres.slice(0, 3).join(" · ")}</p>
                  </div>
                  <SearchIcon size={14} className="text-text-muted" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Empty state overlay: recent + trending keywords */}
      {showOverlay && !cat && (
        <div className="mt-5 space-y-6 animate-fade-in">
          {recent.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-sm font-semibold text-text-dim flex items-center gap-1.5">
                  <Clock size={14} className="text-gold" /> 최근 검색어
                </h3>
                <button onClick={clearRecent} className="text-xs text-text-muted hover:text-gold transition-colors">전체 삭제</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.map((r) => (
                  <button
                    key={r}
                    onMouseDown={() => setQuery(r)}
                    className="text-xs px-3 py-1.5 rounded-full bg-surface-2 border border-border hover:border-gold/60 hover:text-gold transition-colors"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </section>
          )}
          <section>
            <h3 className="text-sm font-semibold text-text-dim mb-2.5 flex items-center gap-1.5">
              <TrendingUp size={14} className="text-gold" /> 지금 인기 검색어
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
              {trendingKeywords.map((k, i) => (
                <button
                  key={k}
                  onMouseDown={() => setQuery(k)}
                  className="flex items-center gap-3 py-1.5 text-left group"
                >
                  <span className={`text-base font-bold w-5 ${i < 3 ? "text-gradient-gold" : "text-text-muted"}`}>
                    {i + 1}
                  </span>
                  <span className="text-sm text-text group-hover:text-gold transition-colors truncate">{k}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Genre chips */}
      {!showOverlay && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide my-4 pb-1">
          <button
            onClick={() => setActiveGenre(null)}
            className={`shrink-0 text-xs md:text-sm px-3.5 py-1.5 rounded-full border transition-all duration-200 ${
              activeGenre === null
                ? "bg-gradient-gold text-black border-gold font-semibold shadow-[0_2px_12px_-2px_rgba(212,175,55,0.6)]"
                : "border-border text-text-dim hover:border-gold/50 hover:text-gold"
            }`}
          >
            전체
          </button>
          {allGenres.map((g) => (
            <button
              key={g}
              onClick={() => setActiveGenre(g)}
              className={`shrink-0 text-xs md:text-sm px-3.5 py-1.5 rounded-full border transition-all duration-200 ${
                activeGenre === g
                  ? "bg-gradient-gold text-black border-gold font-semibold shadow-[0_2px_12px_-2px_rgba(212,175,55,0.6)]"
                  : "border-border text-text-dim hover:border-gold/50 hover:text-gold"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* Section headers for category */}
      {!showOverlay && cat === "trending" && !query && (
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <TrendingUp size={18} className="text-gold" />
          <span className="text-gradient-gold">트렌딩 드라마</span>
        </h2>
      )}
      {!showOverlay && cat === "new" && !query && (
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Sparkles size={18} className="text-gold" />
          <span className="text-gradient-gold">신작 드라마</span>
        </h2>
      )}

      {/* Result count */}
      {!showOverlay && (trimmed || activeGenre) && (
        <p className="text-xs text-text-muted mb-3">
          <span className="text-gold font-semibold">{results.length}</span>개 결과
          {trimmed && <> · "<span className="text-text">{query}</span>"</>}
        </p>
      )}

      {!showOverlay && results.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <SearchIcon size={40} className="text-text-muted mx-auto mb-3" />
          <p className="text-text-dim">검색 결과가 없습니다.</p>
          <p className="text-text-muted text-sm mt-1">다른 키워드로 검색해보세요.</p>
        </div>
      ) : !showOverlay ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-4">
          {results.map((d, i) => (
            <div
              key={d.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${Math.min(i, 12) * 30}ms`, animationFillMode: "backwards" }}
            >
              <DramaCard drama={d} size="sm" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
