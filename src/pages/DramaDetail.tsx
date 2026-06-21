import { useParams, useNavigate, Link } from "react-router-dom";
import { Play, Plus, Check, Share2, Star, Lock, ChevronLeft } from "lucide-react";
import { useDramaDetail } from "../hooks/useDramaDetail";
import { useDramas } from "../hooks/useDramas";
import { useFavorites } from "../hooks/useFavorites";
import DramaRow from "../components/DramaRow";

// ─── 스켈레톤 로딩 UI ─────────────────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="w-full h-[42vh] md:h-[60vh] bg-surface-2" />
      <div className="px-4 md:px-8 mt-4 flex gap-3">
        <div className="flex-1 h-12 bg-surface-2 rounded-md" />
        <div className="w-12 h-12 bg-surface-2 rounded-md" />
        <div className="w-12 h-12 bg-surface-2 rounded-md" />
      </div>
      <div className="px-4 md:px-8 mt-5 space-y-2">
        <div className="h-4 bg-surface-2 rounded w-3/4" />
        <div className="h-4 bg-surface-2 rounded w-full" />
        <div className="h-4 bg-surface-2 rounded w-5/6" />
      </div>
    </div>
  );
}

export default function DramaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // ── Supabase 조회 ──────────────────────────────────────────────────────────
  const { drama, loading, error } = useDramaDetail(id);
  const { dramas: allDramas } = useDramas();
  const { isFavorite, toggleFavorite } = useFavorites();

  // ── 로딩 상태 ──────────────────────────────────────────────────────────────
  if (loading) return <DetailSkeleton />;

  // ── 에러 / 미발견 ──────────────────────────────────────────────────────────
  if (error || !drama) {
    return (
      <div className="px-4 py-20 text-center">
        <p className="text-text-dim">작품을 찾을 수 없습니다.</p>
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        <Link to="/" className="text-gold underline mt-2 inline-block">홈으로 돌아가기</Link>
      </div>
    );
  }

  const similar = allDramas
    .filter((d) => d.id !== drama.id && d.genres.some((g) => drama.genres.includes(g)))
    .slice(0, 10);

  const inList = isFavorite(drama.id);

  return (
    <div className="animate-fade-in">
      {/* Backdrop */}
      <div className="relative w-full h-[42vh] md:h-[60vh] min-h-[320px] overflow-hidden">
        <img src={drama.backdrop} alt={drama.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-base via-base/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />

        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white safe-top"
          aria-label="뒤로가기"
        >
          <ChevronLeft size={22} />
        </button>

        <div className="absolute bottom-0 left-0 right-0 px-4 md:px-8 pb-5 md:pb-8">
          {drama.isExclusive && (
            <span className="inline-block bg-gold text-black text-[10px] font-bold px-2 py-0.5 rounded mb-2">
              FRAMIX 독점
            </span>
          )}
          <h1 className="text-2xl md:text-4xl font-black text-white mb-1.5">{drama.title}</h1>
          {drama.englishTitle && (
            <p className="text-sm text-text-dim mb-2">{drama.englishTitle}</p>
          )}
          <div className="flex items-center gap-2 text-xs md:text-sm text-text-dim flex-wrap">
            <span className="text-gold font-bold flex items-center gap-1">
              <Star size={13} className="fill-gold" /> {drama.rating.toFixed(1)}
            </span>
            <span>{drama.year}</span>
            <span className="border border-text-muted px-1 rounded text-[10px]">{drama.ageRating}</span>
            <span>{drama.totalEpisodes}부작 · {drama.episodeLength}</span>
            <span>· 조회 {(drama.views / 10000).toFixed(0)}만</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 md:px-8 mt-4 flex items-center gap-3">
        <button
          onClick={() => drama.episodes[0] && navigate(`/watch/${drama.id}/${drama.episodes[0].id}`)}
          disabled={!drama.episodes[0]}
          className="flex-1 flex items-center justify-center gap-2 bg-gold text-black font-bold py-3 rounded-md text-sm md:text-base hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play size={18} className="fill-black" />
          1화 재생
        </button>
        <button
          onClick={() => toggleFavorite(drama.id)}
          aria-label="내 보관함에 추가"
          className={`w-12 h-12 rounded-md border flex items-center justify-center transition-colors ${
            inList ? "border-gold text-gold bg-gold/10" : "border-border text-text hover:border-gold"
          }`}
        >
          {inList ? <Check size={20} /> : <Plus size={20} />}
        </button>
        <button
          aria-label="공유"
          className="w-12 h-12 rounded-md border border-border text-text hover:border-gold transition-colors flex items-center justify-center"
        >
          <Share2 size={18} />
        </button>
      </div>

      {/* Synopsis */}
      <div className="px-4 md:px-8 mt-5">
        <p className="text-sm text-text-dim leading-relaxed">{drama.synopsis}</p>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {drama.genres.map((g) => (
            <span key={g} className="text-xs px-2.5 py-1 rounded-full bg-surface-2 text-text-dim border border-border">
              {g}
            </span>
          ))}
          {drama.tags.map((t) => (
            <span key={t} className="text-xs px-2.5 py-1 rounded-full text-gold border border-gold/30">
              {t}
            </span>
          ))}
        </div>
        <div className="mt-4 text-sm text-text-dim space-y-1">
          <p><span className="text-text-muted">출연</span> &nbsp; {drama.cast.join(", ")}</p>
          <p><span className="text-text-muted">연출</span> &nbsp; {drama.director}</p>
        </div>
      </div>

      {/* Episode list */}
      <div className="px-4 md:px-8 mt-7">
        <h2 className="text-base md:text-xl font-bold mb-3">에피소드 ({drama.episodes.length})</h2>
        {drama.episodes.length === 0 ? (
          <p className="text-sm text-text-muted py-6 text-center">등록된 에피소드가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {drama.episodes.map((ep) => (
              <Link
                key={ep.id}
                to={`/watch/${drama.id}/${ep.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2 transition-colors group"
              >
                <div className="relative w-28 md:w-36 aspect-video rounded-md overflow-hidden shrink-0 bg-surface-2">
                  <img src={drama.poster} alt={ep.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                    <Play size={20} className="text-white opacity-0 group-hover:opacity-100" />
                  </div>
                  <span className="absolute bottom-1 right-1 text-[10px] bg-black/70 text-white px-1 rounded">
                    {ep.duration}
                  </span>
                  {!ep.isFree && (
                    <span className="absolute top-1 left-1 bg-black/70 rounded p-0.5">
                      <Lock size={11} className="text-gold" />
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text">
                    {ep.number}화 {!ep.isFree && <span className="text-gold text-xs ml-1">VIP</span>}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
                    {drama.title}의 {ep.number}번째 이야기. 예상치 못한 전개가 시작된다.
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <DramaRow title="비슷한 작품" dramas={similar} />
      </div>
    </div>
  );
}
