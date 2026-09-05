import { useCallback, useState } from "react";
import { toast } from "react-toastify";
import { knowledgeService } from "@/services/knowledge.service";
import { getApiErrorMessage } from "@/lib/http";
import type { ScoredChunk } from "@/types/knowledge";

export function useKnowledgeSearch(projectId: number) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ScoredChunk[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const executeSearch = useCallback(
    async (searchQuery?: string) => {
      const q = (searchQuery ?? query).trim();
      if (!q) {
        toast.warn("Vui lòng nhập từ khóa tìm kiếm.");
        return;
      }

      setIsSearching(true);
      setSearchError(null);

      try {
        const res = await knowledgeService.searchKnowledge(projectId, {
          query: q,
          limit: 6,
          minScore: 0.4,
        });
        setResults(res.data || []);
        setHasSearched(true);
      } catch (err) {
        const msg = getApiErrorMessage(err);
        setSearchError(msg);
        toast.error(msg);
        setResults([]);
        setHasSearched(true);
      } finally {
        setIsSearching(false);
      }
    },
    [projectId, query]
  );

  const clearSearch = useCallback(() => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    setSearchError(null);
  }, []);

  return {
    query,
    setQuery,
    results,
    isSearching,
    hasSearched,
    searchError,
    executeSearch,
    clearSearch,
  };
}
