import { useState } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import { dramas, myListIds } from "../data/mockData";
import DramaCard from "../components/DramaCard";

export default function MyList() {
  const [ids, setIds] = useState<string[]>(myListIds);
  const [editMode, setEditMode] = useState(false);
  const list = dramas.filter((d) => ids.includes(d.id));

  return (
    <div className="px-4 md:px-8 pt-20 md:pt-24 pb-6 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Bookmark size={22} className="text-gold" />
          내 보관함
          <span className="text-text-muted text-sm font-normal">({list.length})</span>
        </h1>
        {list.length > 0 && (
          <button
            onClick={() => setEditMode((v) => !v)}
            className="text-sm text-gold font-medium"
          >
            {editMode ? "완료" : "편집"}
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <div className="text-center py-20">
          <Bookmark size={40} className="text-text-muted mx-auto mb-3" />
          <p className="text-text-dim">보관함이 비어있어요.</p>
          <p className="text-text-muted text-sm mt-1">마음에 드는 작품을 보관함에 담아보세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-4">
          {list.map((d) => (
            <div key={d.id} className="relative">
              <DramaCard drama={d} size="sm" />
              {editMode && (
                <button
                  onClick={() => setIds((prev) => prev.filter((id) => id !== d.id))}
                  className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/70 border border-gold/50 flex items-center justify-center text-gold z-10"
                  aria-label="삭제"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
