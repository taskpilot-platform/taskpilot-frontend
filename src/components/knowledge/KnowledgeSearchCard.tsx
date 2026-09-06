import React from "react";
import { Search, Loader2, Sparkles, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchResultsList } from "./SearchResultsList";
import { useKnowledgeSearch } from "@/hooks/useKnowledgeSearch";

interface KnowledgeSearchCardProps {
  projectId: number;
}

export const KnowledgeSearchCard: React.FC<KnowledgeSearchCardProps> = ({
  projectId,
}) => {
  const { t } = useTranslation();
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

  const sampleQueries = [
    t("knowledge.sample_query_1"),
    t("knowledge.sample_query_2"),
    t("knowledge.sample_query_3"),
    t("knowledge.sample_query_4"),
  ];

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
          {t("knowledge.search_card_title")}
        </CardTitle>
        <CardDescription className="text-xs">
          {t("knowledge.search_card_desc")}
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
              placeholder={t("knowledge.search_placeholder")}
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
                {t("knowledge.search_btn_searching")}
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                {t("knowledge.search_btn")}
              </>
            )}
          </Button>
        </form>

        {/* Quick UAT Test Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-medium text-muted-foreground mr-1">
            {t("knowledge.sample_queries_label")}
          </span>
          {sampleQueries.map((testQuery) => (
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
