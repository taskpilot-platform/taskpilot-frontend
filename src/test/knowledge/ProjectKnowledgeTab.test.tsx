import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProjectKnowledgeTab } from "@/components/knowledge/ProjectKnowledgeTab";
import * as useProjectDocumentsModule from "@/hooks/useProjectDocuments";

describe("ProjectKnowledgeTab Security & Integration", () => {
  it("renders 403 Forbidden alert when user is unauthorized for project knowledge", () => {
    vi.spyOn(useProjectDocumentsModule, "useProjectDocuments").mockReturnValue({
      documents: [],
      isLoading: false,
      isPolling: false,
      error: "403 Forbidden: User 999 is not authorized to access knowledge for project 100",
      refetch: vi.fn(),
      deleteDocument: vi.fn(),
      retryDocument: vi.fn(),
      isDeleting: () => false,
      isRetrying: () => false,
    });

    render(<ProjectKnowledgeTab projectId={100} />);

    expect(
      screen.getByText("Không có quyền truy cập tri thức dự án")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Bạn không phải là thành viên hợp lệ của dự án này/i)
    ).toBeInTheDocument();
  });

  it("renders knowledge header, upload card, and search card when authorized", () => {
    vi.spyOn(useProjectDocumentsModule, "useProjectDocuments").mockReturnValue({
      documents: [
        {
          id: 1,
          projectId: 100,
          originalFilename: "spec.pdf",
          contentType: "application/pdf",
          fileSize: 1024 * 300,
          status: "READY",
          errorMessage: null,
          chunkCount: 12,
          createdBy: 5,
          createdAt: "2026-09-05T12:00:00Z",
          updatedAt: "2026-09-05T12:01:00Z",
        },
      ],
      isLoading: false,
      isPolling: false,
      error: null,
      refetch: vi.fn(),
      deleteDocument: vi.fn(),
      retryDocument: vi.fn(),
      isDeleting: () => false,
      isRetrying: () => false,
    });

    render(<ProjectKnowledgeTab projectId={100} />);

    expect(
      screen.getByText(/Kho Tri Thức Dự Án/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Tìm Kiếm Tri Thức Dự Án/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Tải Lên Tài Liệu Dự Án/i)
    ).toBeInTheDocument();
    expect(screen.getByText("spec.pdf")).toBeInTheDocument();
  });
});
