import { useMemo, useState } from "react";
import { Bookmark, Trash2, LayoutGrid, List as ListIcon, ArrowDownUp, Check, LogIn } from "lucide-react";
import DramaCard from "../components/DramaCard";
import { Link } from "react-router-dom";
import { useFavorites } from "../hooks/useFavorites";
import { useDramas } from "../hooks/useDramas";

type SortKey = "recent" | "title" | "rating";
type View = "grid" | "list";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "최근 추가" },
  { key: "rating", label: "평점 높은순" },
  { key: "title", label: "가나다순" },
];

export default function MyList() {
  const { dramas } = useDramas();
  const { favoriteIds, loading, error, isLoggedIn, removeFavorite } = useFavorites();

  const [editMode, setEditMode] = useState(false);
  const [sort, setSort] = useState<SortKey>("recent");
  const [view, setView] = useState<View>("grid");
  const [genre, setGenre] = useState<string | null>(null);

  // favoriteIds 순서 기준으로 dramas 필터 (최근 추가순 유지)
  const baseList = useMemo(
    () =>
      favoriteIds
        .map((fid) => dramas.find((d) => d.id === fid))
        .filter(Boolean) as typeof dramas,
    [favoriteIds, dramas]
  );

  const genres = useMemo(
    () => Array.from(new Set(baseList.flatMap((d) => d.genres))),
    [baseList]
  );

  const list = useMemo(() => {
    let l = [...baseList];
    if (genre) l = l.filter((d) => d.genres.includes(genre));
    if (sort === "title") l.sort((a, b) => a.title.localeCompare(b.title, "ko"));
    else if (sort === "rating") l.sort((a, b) => b.rating - a.rating);
    // "recent" → favoriteIds 순서 그대로
    return l;
  }, [baseList, genre, sort]);

  return (
    <div className="px-4 md:px-8 pt-20 md:pt-24 pb-10 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl mb-6 border border-border bg-gradient-to-br from-surface-2 via-surface to-base px-5 py-5 md:px-7 md:py-6">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
        <div className="relative flex items-start md:items-center justify-between gap-3 flex-col md:flex-row">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-gold flex items-center justify-center shrink-0 shadow-[0_4px_20px_-4px_rgba(212,175,55,0.6)]">
              <Bookmark size={20} className="text-black fill-black" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gradient-gold leading-tight">내 보관함</h1>
              <p className="text-xs text-text-muted mt-0.5">
                <span className="text-gold font-semibold">{baseList.length}</span>개의 작품이 담겨 있어요
              </p>
            </div>
          </div>
          {baseList.length > 0 && (
            <button
              onClick={() => setEditMode((v) => !v)}
              className={`text-xs md:text-sm px-3.5 py-1.5 rounded-full border font-medium transition-all ${
                editMode
                  ? "bg-gold text-black border-gold"
                  : "border-gold/50 text-gold hover:bg-gold/10"
              }`}
            >
              {editMode ? "완료" : "편집"}
            </button>
          )}
        </div>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-[2/3] rounded-lg bg-surface-2" />
          ))}
        </div>
      )}

      {/* 오류 */}
      {!loading && error && (
        <div className="text-center py-10 text-red-400 text-sm">{error}</div>
      )}

      {/* 미로그인 */}
      {!loading && !error && !isLoggedIn && (
        <div className="text-center py-20 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-surface-2 border border-border flex items-center justify-center mx-auto mb-4">
            <LogIn size={26} className="text-text-muted" />
          </div>
          <p className="text-text-dim font-medium">로그인이 필요합니다</p>
          <p className="text-text-muted text-sm mt-1">보관함을 이용하려면 로그인하세요.</p>
        </div>
      )}

      {/* 빈 보관함 */}
      {!loading && !error && isLoggedIn && baseList.length === 0 && (
        <div className="text-center py-20 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-surface-2 border border-border flex items-center justify-center mx-auto mb-4">
            <Bookmark size={26} className="text-text-muted" />
          </div>
          <p className="text-text-dim font-medium">보관함이 비어있어요</p>
          <p className="text-text-muted text-sm mt-1">마음에 드는 작품을 보관함에 담아보세요.</p>
          <Link
            to="/search"
            className="inline-block mt-5 px-5 py-2 rounded-full bg-gradient-gold text-black text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            작품 둘러보기
          </Link>
        </div>
      )}

      {/* 목록 */}
      {!loading && !error && isLoggedIn && baseList.length > 0 && (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex gap-1.5 items-center">
              <ArrowDownUp size={13} className="text-text-muted shrink-0" />
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                {SORTS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setSort(s.key)}
                    className={`shrink-0 text-[11px] md:text-xs px-2.5 py-1 rounded-md border transition-colors ${
                      sort === s.key
                        ? "bg-gold/15 border-gold/60 text-gold"
                        : "border-border text-text-dim hover:text-text"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="hidden md:flex items-center gap-1 border border-border rounded-md p-0.5">
              <button
                onClick={() => setView("grid")}
                className={`p-1.5 rounded ${view === "grid" ? "bg-gold/15 text-gold" : "text-text-muted"}`}
                aria-label="그리드 보기"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setView("list")}
                className={`p-1.5 rounded ${view === "list" ? "bg-gold/15 text-gold" : "text-text-muted"}`}
                aria-label="목록 보기"
              >
                <ListIcon size={14} />
              </button>
            </div>
          </div>

          {genres.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-5 pb-1">
              <button
                onClick={() => setGenre(null)}
                className={`shrink-0 text-[11px] md:text-xs px-3 py-1.5 rounded-full border transition-all ${
                  genre === null ? "bg-gradient-gold text-black border-gold font-semibold" : "border-border text-text-dim"
                }`}
              >
                전체 {baseList.length}
              </button>
              {genres.map((g) => (
                <button
                  key={g}
                  onClick={() => setGenre(genre === g ? null : g)}
                  className={`shrink-0 text-[11px] md:text-xs px-3 py-1.5 rounded-full border transition-all ${
                    genre === g ? "bg-gradient-gold text-black border-gold font-semibold" : "border-border text-text-dim hover:border-gold/50"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}

          {/* Grid / List */}
          {view === "grid" ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-4">
              {list.map((d, i) => (
                <div
                  key={d.id}
                  className="relative animate-fade-in-up"
                  style={{ animationDelay: `${Math.min(i, 12) * 35}ms`, animationFillMode: "backwards" }}
                >
                  <DramaCard drama={d} size="sm" />
                  {editMode && (
                    <button
                      onClick={() => removeFavorite(d.id)}
                      className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/80 border border-gold/60 flex items-center justify-center text-gold z-10 hover:bg-danger hover:border-danger hover:text-white transition-colors"
                      aria-label="삭제"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                  {editMode && (
                    <div className="absolute inset-0 rounded-lg ring-2 ring-gold/40 pointer-events-none" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-surface">
              {list.map((d, i) => (
                <li
                  key={d.id}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-2 transition-colors animate-fade-in"
                  style={{ animationDelay: `${i * 25}ms`, animationFillMode: "backwards" }}
                >
                  <Link to={`/drama/${d.id}`} className="shrink-0">
                    <img src={d.poster} alt="" className="w-12 h-16 object-cover rounded-md" />
                  </Link>
                  <Link to={`/drama/${d.id}`} className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{d.title}</p>
                    <p className="text-xs text-text-muted truncate mt-0.5">
                      ★ {d.rating.toFixed(1)} · {d.totalEpisodes}부작 · {d.genres.slice(0, 2).join(", ")}
                    </p>
                  </Link>
                  {editMode ? (
                    <button
                      onClick={() => removeFavorite(d.id)}
                      className="w-8 h-8 rounded-full bg-surface-2 border border-border hover:border-danger hover:text-danger flex items-center justify-center text-text-dim transition-colors"
                      aria-label="삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : (
                    <Check size={16} className="text-gold/70" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
