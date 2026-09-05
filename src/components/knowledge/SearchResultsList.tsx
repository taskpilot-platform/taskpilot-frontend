import React from "react";
import { SearchX, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchResultItem } from "./SearchResultItem";
import type { ScoredChunk } from "@/types/knowledge";

interface SearchResultsListProps {
  results: ScoredChunk[];
  isSearching: boolean;
  hasSearched: boolean;
  searchError: string | null;
  onClear: () => void;
}

export const SearchResultsList: React.FC<SearchResultsListProps> = ({
  results,
  isSearching,
  hasSearched,
  searchError,
  onClear,
}) => {
  if (isSearching) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-8 text-center animate-pulse">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <h4 className="text-sm font-semibold text-foreground">
          Đang truy vấn không gian vector 768 chiều...
        </h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Đang tính toán khoảng cách cosine trên PostgreSQL pgvector HNSW index.
        </p>
      </div>
    );
  }

  if (searchError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20 p-6 text-center">
        <SearchX className="h-8 w-8 text-rose-500 mb-2" />
        <h4 className="text-sm font-semibold text-rose-700 dark:text-rose-400">
          Lỗi tìm kiếm tri thức
        </h4>
        <p className="mt-1 text-xs text-muted-foreground">{searchError}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClear}
          className="mt-3 text-xs"
        >
          Xóa kết quả
        </Button>
      </div>
    );
  }

  if (hasSearched && results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
        <SearchX className="h-10 w-10 text-muted-foreground/60 mb-2" />
        <h4 className="text-sm font-semibold text-foreground">
          Không tìm thấy đoạn tri thức phù hợp
        </h4>
        <p className="mt-1 max-w-md text-xs text-muted-foreground leading-relaxed">
          Không có đoạn văn bản nào trong tài liệu dự án vượt qua ngưỡng tương đồng cosine tối thiểu. Hệ thống đảm bảo không sinh dữ liệu sai lệch (hallucination).
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="mt-3 text-xs text-muted-foreground hover:text-foreground"
        >
          Xóa bộ lọc tìm kiếm
        </Button>
      </div>
    );
  }

  if (!hasSearched) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>Tìm thấy {results.length} đoạn tri thức liên quan:</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
        >
          <X className="h-3 w-3" />
          Thu gọn
        </Button>
      </div>

      <div className="flex flex-col gap-2.5">
        {results.map((chunk, index) => (
          <SearchResultItem
            key={`${chunk.documentId}-${chunk.chunkIndex}`}
            chunk={chunk}
            rank={index + 1}
          />
        ))}
      </div>
    </div>
  );
};
