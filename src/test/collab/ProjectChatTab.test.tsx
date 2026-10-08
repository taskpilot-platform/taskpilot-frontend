import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ProjectChatTab } from "@/components/chat/ProjectChatTab";
import { projectChatService } from "@/services/project-chat.service";

describe("ProjectChatTab Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(projectChatService, "createStompClient").mockReturnValue({
      activate: vi.fn(),
      deactivate: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof projectChatService.createStompClient>);
  });

  it("renders empty state when there are no messages", async () => {
    vi.spyOn(projectChatService, "getMessages").mockResolvedValue({
      status: 200,
      message: "Success",
      data: {
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: 0,
        size: 50,
      },
    });

    render(<ProjectChatTab projectId={100} currentUserId={1} />);

    await waitFor(() => {
      expect(screen.getByText("No messages yet")).toBeInTheDocument();
    });
    expect(screen.getByText("Say hello to your project teammates to kick off collaboration!")).toBeInTheDocument();
  });

  it("renders messages list with sender name and content", async () => {
    vi.spyOn(projectChatService, "getMessages").mockResolvedValue({
      status: 200,
      message: "Success",
      data: {
        content: [
          {
            id: 1,
            projectId: 100,
            senderId: 2,
            senderName: "Sarah Connor",
            messageType: "TEXT",
            content: "Hello team, let's sync up for sprint review!",
            createdAt: "2026-10-08T08:00:00Z",
          },
        ],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 50,
      },
    });

    render(<ProjectChatTab projectId={100} currentUserId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Hello team, let's sync up for sprint review!")).toBeInTheDocument();
      expect(screen.getByText("Sarah Connor")).toBeInTheDocument();
    });
  });

  it("disables send button when project is archived", async () => {
    vi.spyOn(projectChatService, "getMessages").mockResolvedValue({
      status: 200,
      message: "Success",
      data: {
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: 0,
        size: 50,
      },
    });

    render(<ProjectChatTab projectId={100} isArchived={true} currentUserId={1} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Project is archived")).toBeDisabled();
    });
  });
});
