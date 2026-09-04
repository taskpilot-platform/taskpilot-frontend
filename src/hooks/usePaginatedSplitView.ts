import { useState, useMemo } from "react";

export interface PaginatedSplitViewOptions<T extends { id: number }> {
  fetchItems: (page: number, size: number, keyword?: string) => Promise<{ content: T[]; totalElements: number; number: number }>;
  defaultPageSize?: number;
  onError?: (error: unknown) => void;
}

export function usePaginatedSplitView<T extends { id: number }>({
  fetchItems,
  defaultPageSize = 10,
  onError,
}: PaginatedSplitViewOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [keyword, setKeyword] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<"list" | "create" | "detail">("list");
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalElements / pageSize)),
    [totalElements, pageSize]
  );

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedId) || null,
    [items, selectedId]
  );

  const loadList = async (targetPage = currentPage, limit = pageSize, kw = keyword) => {
    setIsLoading(true);
    try {
      const data = await fetchItems(targetPage, limit, kw.trim() || undefined);
      setItems(data.content);
      setTotalElements(data.totalElements);
      setCurrentPage(data.number);
      if (data.content.length === 0) {
        setSelectedId(null);
      } else {
        setSelectedId((prev) => {
          if (prev !== null && !data.content.some((i) => i.id === prev)) {
            setMode("list");
            return null;
          }
          return prev;
        });
      }
    } catch (error) {
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  const setPage = (page: number) => {
    setCurrentPage(page);
    void loadList(page, pageSize, keyword);
  };

  return {
    items,
    setItems,
    totalElements,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    keyword,
    setKeyword,
    selectedId,
    setSelectedId,
    selectedItem,
    mode,
    setMode,
    isLoading,
    setIsLoading,
    isMutating,
    setIsMutating,
    totalPages,
    loadList,
    setPage,
  };
}
