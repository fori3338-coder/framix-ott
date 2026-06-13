import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Search as SearchIcon, X } from "lucide-react";
import { dramas } from "../data/mockData";
import DramaCard from "../components/DramaCard";

const allGenres = Array.from(new Set(dramas.flatMap((d) => d.genres)));

export default function Search() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [prevCat, setPrevCat] = useState(params.get("cat"));

  const cat = params.get("cat");

  if (cat !== prevCat) {
    setPrevCat(cat);
    if (cat === "trending" || cat === "new") {
      setActiveGenre(null);
    }
  }

  const results = useMemo(() => {
    let list = [...dramas];

    if (cat === "trending") {
      list = list.sort((a, b) => b.views - a.views);
    } else if (cat === "new") {
      list = list.filter((d) => d.isNew);
    }

    if (activeGenre) {
      list = list.filter((d) => d.genres.includes(activeGenre));
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.englishTitle?.toLowerCase().includes(q) ||
          d.genres.some((g) => g.toLowerCase().includes(q))
      );
    }

    return list;
  }, [query, activeGenre, cat]);

  return (
    <div className="px-4 md:px-8 pt-20 md:pt-24 pb-6 animate-fade-in">
      <div className="relative mb-4">
        <SearchIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setParams((p) => {
              const next = new URLSearchParams(p);
              if (e.target.value) next.set("q", e.target.value);
              else next.delete("q");
              return next;
            });
          }}
          placeholder="작품, 장르, 키워드 검색"
          className="w-full bg-surface-2 border border-border rounded-lg pl-10 pr-10 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-gold transition-colors"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setParams({}); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
            aria-label="검색어 지우기"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-5 pb-1">
        <button
          onClick={() => setActiveGenre(null)}
          className={`shrink-0 text-xs md:text-sm px-3.5 py-1.5 rounded-full border transition-colors ${
            activeGenre === null ? "bg-gold text-black border-gold font-semibold" : "border-border text-text-dim"
          }`}
        >
          전체
        </button>
        {allGenres.map((g) => (
          <button
            key={g}
            onClick={() => setActiveGenre(g)}
            className={`shrink-0 text-xs md:text-sm px-3.5 py-1.5 rounded-full border transition-colors ${
              activeGenre === g ? "bg-gold text-black border-gold font-semibold" : "border-border text-text-dim"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {cat === "trending" && !query && (
        <h2 className="text-lg font-bold mb-3">🔥 트렌딩 드라마</h2>
      )}
      {cat === "new" && !query && (
        <h2 className="text-lg font-bold mb-3">🆕 신작 드라마</h2>
      )}

      {results.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-text-dim">검색 결과가 없습니다.</p>
          <p className="text-text-muted text-sm mt-1">다른 키워드로 검색해보세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-4">
          {results.map((d) => (
            <DramaCard key={d.id} drama={d} size="sm" />
          ))}
        </div>
      )}
    </div>
  );
}
