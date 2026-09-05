import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SearchResultsList } from "@/components/knowledge/SearchResultsList";
import type { ScoredChunk } from "@/types/knowledge";

describe("SearchResultsList", () => {
  const mockChunks: ScoredChunk[] = [
    {
      chunkId: 101,
      documentId: 1,
      projectId: 100,
      chunkIndex: 4,
      content:
        "Mục tiêu xây dựng hệ thống quản lý dự án TaskPilot là tối ưu hóa phân công và gợi ý nhân sự.",
      similarity: 0.7217,
    },
    {
      chunkId: 102,
      documentId: 1,
      projectId: 100,
      chunkIndex: 5,
      content:
        "Kiến trúc hệ thống sử dụng Spring Boot 4.1.0 và PostgreSQL pgvector.",
      similarity: 0.6542,
    },
  ];

  it("renders loading indicator when isSearching is true", () => {
    render(
      <SearchResultsList
        results={[]}
        isSearching={true}
        hasSearched={false}
        searchError={null}
        onClear={vi.fn()}
      />
    );

    expect(
      screen.getByText("Đang truy vấn không gian vector 768 chiều...")
    ).toBeInTheDocument();
  });

  it("renders search error message when search fails", () => {
    render(
      <SearchResultsList
        results={[]}
        isSearching={false}
        hasSearched={true}
        searchError="Network connection timeout to pgvector database"
        onClear={vi.fn()}
      />
    );

    expect(screen.getByText("Lỗi tìm kiếm tri thức")).toBeInTheDocument();
    expect(
      screen.getByText("Network connection timeout to pgvector database")
    ).toBeInTheDocument();
  });

  it("renders empty results message when no relevant chunks found", () => {
    render(
      <SearchResultsList
        results={[]}
        isSearching={false}
        hasSearched={true}
        searchError={null}
        onClear={vi.fn()}
      />
    );

    expect(
      screen.getByText("Không tìm thấy đoạn tri thức phù hợp")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Không có đoạn văn bản nào trong tài liệu dự án/i)
    ).toBeInTheDocument();
  });

  it("renders retrieved chunks with rank, similarity percentage, and content", () => {
    const onClearMock = vi.fn();

    render(
      <SearchResultsList
        results={mockChunks}
        isSearching={false}
        hasSearched={true}
        searchError={null}
        onClear={onClearMock}
      />
    );

    expect(
      screen.getByText("Tìm thấy 2 đoạn tri thức liên quan:")
    ).toBeInTheDocument();

    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText(/72.2%/)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Mục tiêu xây dựng hệ thống quản lý dự án TaskPilot là tối ưu hóa/i
      )
    ).toBeInTheDocument();

    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(screen.getByText(/65.4%/)).toBeInTheDocument();

    const collapseButton = screen.getByRole("button", { name: /Thu gọn/i });
    fireEvent.click(collapseButton);
    expect(onClearMock).toHaveBeenCalled();
  });
});
