import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DocumentList } from "@/components/knowledge/DocumentList";
import { DocumentListItem } from "@/components/knowledge/DocumentListItem";
import type { ProjectDocument } from "@/types/knowledge";

describe("DocumentList & DocumentListItem", () => {
  const mockDocReady: ProjectDocument = {
    id: 1,
    projectId: 100,
    originalFilename: "architecture.pdf",
    contentType: "application/pdf",
    fileSize: 1024 * 500, // 500 KB
    status: "READY",
    errorMessage: null,
    chunkCount: 15,
    createdBy: 10,
    createdAt: "2026-09-05T10:00:00Z",
    updatedAt: "2026-09-05T10:01:00Z",
  };

  const mockDocFailed: ProjectDocument = {
    id: 2,
    projectId: 100,
    originalFilename: "corrupted.docx",
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    fileSize: 1024 * 100, // 100 KB
    status: "FAILED",
    errorMessage: "Processing timed out or was interrupted by system restart. Please retry.",
    chunkCount: 0,
    createdBy: 10,
    createdAt: "2026-09-05T11:00:00Z",
    updatedAt: "2026-09-05T11:16:00Z",
  };

  it("renders empty state when document list is empty", () => {
    render(
      <DocumentList
        documents={[]}
        isLoading={false}
        onDeleteDocument={vi.fn()}
        onRetryDocument={vi.fn()}
        isDeleting={() => false}
        isRetrying={() => false}
      />
    );

    expect(screen.getByText("Chưa có tài liệu nào trong dự án")).toBeInTheDocument();
    expect(
      screen.getByText(/Hãy tải lên tài liệu dự án/i)
    ).toBeInTheDocument();
  });

  it("renders READY document with filename, formatted size, and chunk count", () => {
    render(
      <DocumentListItem
        document={mockDocReady}
        isRetrying={false}
        isDeleting={false}
        onRetry={vi.fn()}
        onDeleteRequest={vi.fn()}
      />
    );

    expect(screen.getByText("architecture.pdf")).toBeInTheDocument();
    expect(screen.getByText(/500 KB/i)).toBeInTheDocument();
    expect(screen.getByText(/15 chunks/i)).toBeInTheDocument();
    expect(screen.getByText("Sẵn sàng")).toBeInTheDocument();
  });

  it("renders FAILED document with error message and Retry action button", () => {
    const onRetryMock = vi.fn();

    render(
      <DocumentListItem
        document={mockDocFailed}
        isRetrying={false}
        isDeleting={false}
        onRetry={onRetryMock}
        onDeleteRequest={vi.fn()}
      />
    );

    expect(screen.getByText("corrupted.docx")).toBeInTheDocument();
    expect(screen.getByText("Thất bại")).toBeInTheDocument();
    expect(
      screen.getByText(/Processing timed out or was interrupted/i)
    ).toBeInTheDocument();

    const retryButton = screen.getByRole("button", { name: /Thử lại/i });
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(onRetryMock).toHaveBeenCalledWith(mockDocFailed);
  });

  it("triggers onDeleteRequest when delete button is clicked", () => {
    const onDeleteMock = vi.fn();

    render(
      <DocumentListItem
        document={mockDocReady}
        isRetrying={false}
        isDeleting={false}
        onRetry={vi.fn()}
        onDeleteRequest={onDeleteMock}
      />
    );

    const deleteButton = screen.getByTitle("Xóa tài liệu");
    fireEvent.click(deleteButton);
    expect(onDeleteMock).toHaveBeenCalledWith(mockDocReady);
  });
});
