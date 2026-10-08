import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ProjectFilesTab } from "@/components/files/ProjectFilesTab";
import { projectFilesService } from "@/services/project-files.service";

describe("ProjectFilesTab Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders empty state when project has no files", async () => {
    vi.spyOn(projectFilesService, "getFiles").mockResolvedValue({
      status: 200,
      message: "Success",
      data: {
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: 20,
        number: 0,
      },
    });

    render(<ProjectFilesTab projectId={100} />);

    await waitFor(() => {
      expect(screen.getByText("No files in this project yet")).toBeInTheDocument();
    });
    expect(screen.getByText(/Upload architecture specs, design files, or assets/i)).toBeInTheDocument();
  });

  it("renders files list with correct details", async () => {
    vi.spyOn(projectFilesService, "getFiles").mockResolvedValue({
      status: 200,
      message: "Success",
      data: {
        content: [
          {
            id: 1,
            projectId: 100,
            uploaderId: 5,
            uploaderName: "Alex Rivera",
            fileName: "system_architecture.pdf",
            originalName: "system_architecture.pdf",
            fileSize: 1024 * 500,
            storageKey: "projects/100/files/uuid_spec.pdf",
            storageBucket: "taskpilot-bucket",
            createdAt: "2026-10-08T08:00:00Z",
            updatedAt: "2026-10-08T08:00:00Z",
          },
        ],
        totalElements: 1,
        totalPages: 1,
        size: 20,
        number: 0,
      },
    });

    render(<ProjectFilesTab projectId={100} />);

    await waitFor(() => {
      expect(screen.getByText("system_architecture.pdf")).toBeInTheDocument();
      expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
      expect(screen.getByText("500 KB")).toBeInTheDocument();
    });
  });

  it("hides upload button when project is archived", async () => {
    vi.spyOn(projectFilesService, "getFiles").mockResolvedValue({
      status: 200,
      message: "Success",
      data: {
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: 20,
        number: 0,
      },
    });

    render(<ProjectFilesTab projectId={100} isArchived={true} />);

    await waitFor(() => {
      expect(screen.queryByText("Upload File")).toBeNull();
    });
  });
});
