import React from "react";
import { Search, Loader2, Sparkles, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchResultsList } from "./SearchResultsList";
import { useKnowledgeSearch } from "@/hooks/useKnowledgeSearch";

interface KnowledgeSearchCardProps {
  projectId: number;
}

const QUICK_TEST_QUERIES = [
  "Mục tiêu xây dựng hệ thống TaskPilot",
  "Kiến trúc và công nghệ sử dụng",
  "Quy trình hoạt động RAG",
  "Công thức làm bánh pizza",
];

export const KnowledgeSearchCard: React.FC<KnowledgeSearchCardProps> = ({
  projectId,
}) => {
  const {
    query,
    setQuery,
    results,
    isSearching,
    hasSearched,
    searchError,
    executeSearch,
    clearSearch,
  } = useKnowledgeSearch(projectId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void executeSearch();
  };

  const handleChipClick = (testQuery: string) => {
    setQuery(testQuery);
    void executeSearch(testQuery);
  };

  return (
    <Card className="shadow-sm border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Tìm Kiếm Tri Thức Dự Án (Semantic Search)
        </CardTitle>
        <CardDescription className="text-xs">
          Tìm kiếm ngữ nghĩa trực tiếp trên các đoạn tài liệu dự án bằng PostgreSQL pgvector với độ đo Cosine Similarity.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search input form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nhập câu hỏi hoặc từ khóa ngữ nghĩa (VD: Mục tiêu của dự án là gì?)..."
              className="pl-9 pr-8 text-sm"
              disabled={isSearching}
            />
            {query && !isSearching && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="gap-2 font-medium shrink-0"
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tìm...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Tìm kiếm
              </>
            )}
          </Button>
        </form>

        {/* Quick UAT Test Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-medium text-muted-foreground mr-1">
            Truy vấn mẫu UAT:
          </span>
          {QUICK_TEST_QUERIES.map((testQuery) => (
            <Badge
              key={testQuery}
              variant="outline"
              onClick={() => handleChipClick(testQuery)}
              className="cursor-pointer text-[11px] hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              {testQuery}
            </Badge>
          ))}
        </div>

        {/* Search results */}
        <SearchResultsList
          results={results}
          isSearching={isSearching}
          hasSearched={hasSearched}
          searchError={searchError}
          onClear={clearSearch}
        />
      </CardContent>
    </Card>
  );
};
