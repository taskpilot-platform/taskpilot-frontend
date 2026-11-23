import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GlobalChatPage from "@/pages/GlobalChatPage";
import { CreateGroupChatModal } from "@/components/chat/CreateGroupChatModal";
import { CustomGroupChatView } from "@/components/chat/CustomGroupChatView";
import { isCustomChatDemoEnabled } from "@/lib/features";
import { customChatStorage } from "@/lib/custom-chat-storage";
import { useAuthStore } from "@/stores/auth.store";
import { profileService } from "@/services/profile.service";
import { projectService } from "@/services/project.service";
import { projectChatService } from "@/services/project-chat.service";

const LEGACY_GROUPS_KEY = "taskpilot_custom_group_chats";
const LEGACY_MSG_KEY = "taskpilot_custom_chat_msg_grp-legacy-1";
const LEGACY_GROUPS_BYTES = JSON.stringify([
  {
    id: "grp-legacy-1",
    name: "Legacy Unscoped Group",
    createdAt: "2026-10-01T00:00:00Z",
    createdBy: 99,
    members: [{ id: 99, name: "Prior User", email: "prior@taskpilot.local", role: "OWNER" }],
    lastMessage: "Confidential prior account note",
  },
]);
const LEGACY_MSG_BYTES = JSON.stringify([
  {
    id: 1,
    projectId: -1,
    senderId: 99,
    senderName: "Prior User",
    content: "Prior user secret message",
    messageType: "TEXT",
    createdAt: "2026-10-01T00:00:00Z",
  },
]);

describe("P4.3 Custom Chat Containment & Account Isolation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    localStorage.clear();
    useAuthStore.setState({
      accessToken: "tok-10",
      refreshToken: "ref-10",
      isAuthenticated: true,
      role: "USER",
      user: {
        id: 10,
        email: "alice@taskpilot.local",
        fullName: "Alice User",
        avatarUrl: null,
        role: "USER",
        status: "AVAILABLE",
        currentWorkload: 0,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    });

    vi.spyOn(projectChatService, "createStompClient").mockReturnValue({
      activate: vi.fn(),
      deactivate: vi.fn().mockResolvedValue(undefined),
    } as never);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  it("keeps custom chat disabled by default and in production builds even if env var is true", () => {
    expect(isCustomChatDemoEnabled()).toBe(false);

    vi.stubEnv("VITE_ENABLE_CUSTOM_CHAT_DEMO", "true");
    vi.stubEnv("PROD", true);
    vi.stubEnv("DEV", false);
    expect(isCustomChatDemoEnabled()).toBe(false);

    vi.unstubAllEnvs();
    vi.stubEnv("VITE_ENABLE_CUSTOM_CHAT_DEMO", "true");
    vi.stubEnv("MODE", "production");
    expect(isCustomChatDemoEnabled()).toBe(false);
  });

  it("blocks custom group load/create/select/send on ?group= and empty workspace in normal mode while preserving legacy bytes and real project chat", async () => {
    localStorage.setItem(LEGACY_GROUPS_KEY, LEGACY_GROUPS_BYTES);
    localStorage.setItem(LEGACY_MSG_KEY, LEGACY_MSG_BYTES);

    vi.spyOn(profileService, "getMe").mockResolvedValue({
      status: 200,
      message: "OK",
      data: { id: 10, email: "alice@taskpilot.local", fullName: "Alice User", role: "USER" },
    } as never);

    vi.spyOn(projectService, "getMyProjects").mockResolvedValue({
      status: 200,
      message: "OK",
      data: {
        content: [
          {
            id: 100,
            name: "Real Project Channel",
            status: "ACTIVE",
            myRole: "MEMBER",
          },
        ],
      },
    } as never);

    vi.spyOn(projectChatService, "getMessages").mockResolvedValue({
      status: 200,
      message: "OK",
      data: {
        content: [
          {
            id: 500,
            projectId: 100,
            senderId: 2,
            senderName: "Teammate",
            messageType: "TEXT",
            content: "Real STOMP project message",
            createdAt: "2026-11-17T00:00:00Z",
          },
        ],
      },
    } as never);

    const { unmount } = render(
      <MemoryRouter initialEntries={["/chat?group=grp-legacy-1"]}>
        <GlobalChatPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("global-chat-page")).toBeInTheDocument();
      expect(screen.getByText("Real STOMP project message")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("btn-open-create-group")).not.toBeInTheDocument();
    expect(screen.queryByTestId("group-item-grp-legacy-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("custom-group-chat-view")).not.toBeInTheDocument();
    expect(screen.queryByText("Legacy Unscoped Group")).not.toBeInTheDocument();
    expect(screen.queryByText("Prior user secret message")).not.toBeInTheDocument();
    expect(screen.getByTestId("channel-item-100")).toBeInTheDocument();
    expect(screen.getByTestId("active-channel-name")).toHaveTextContent("Real Project Channel");

    // Legacy storage remains byte-identical
    expect(localStorage.getItem(LEGACY_GROUPS_KEY)).toBe(LEGACY_GROUPS_BYTES);
    expect(localStorage.getItem(LEGACY_MSG_KEY)).toBe(LEGACY_MSG_BYTES);

    unmount();

    // Empty workspace in normal mode also has no custom group create entry
    vi.spyOn(projectService, "getMyProjects").mockResolvedValue({
      status: 200,
      message: "OK",
      data: { content: [] },
    } as never);

    render(
      <MemoryRouter initialEntries={["/chat?group=grp-legacy-1"]}>
        <GlobalChatPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("global-chat-empty")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("btn-open-create-group")).not.toBeInTheDocument();
    expect(screen.queryByTestId("custom-group-chat-view")).not.toBeInTheDocument();
    expect(localStorage.getItem(LEGACY_GROUPS_KEY)).toBe(LEGACY_GROUPS_BYTES);
    expect(localStorage.getItem(LEGACY_MSG_KEY)).toBe(LEGACY_MSG_BYTES);
  });

  it("isolates optional dev demo records per user, clears transient state on logout, fails closed on missing uid, and never injects fake colleagues", async () => {
    vi.stubEnv("VITE_ENABLE_CUSTOM_CHAT_DEMO", "true");
    localStorage.setItem(LEGACY_GROUPS_KEY, LEGACY_GROUPS_BYTES);
    localStorage.setItem(LEGACY_MSG_KEY, LEGACY_MSG_BYTES);

    // Missing/invalid uid fails closed
    expect(customChatStorage.getGroups(null)).toEqual([]);
    expect(customChatStorage.getGroups(0)).toEqual([]);
    expect(() =>
      customChatStorage.createGroup("Invalid", "", [], null),
    ).toThrow(/Authenticated user ID/);
    expect(() =>
      customChatStorage.sendMessage("grp-1", "hi", null, "Anon"),
    ).toThrow(/Authenticated user ID/);

    const { container: noUidContainer } = render(
      <CustomGroupChatView
        group={{
          id: "grp-1",
          name: "Test",
          createdAt: "2026-11-17T00:00:00Z",
          createdBy: 10,
          ownerUserId: 10,
          schemaVersion: 2,
          members: [],
        }}
        currentUserId={null}
      />,
    );
    expect(noUidContainer.firstChild).toBeNull();

    // No fake colleagues in CreateGroupChatModal
    vi.spyOn(projectService, "getMyProjects").mockResolvedValue({
      status: 200,
      message: "OK",
      data: { content: [] },
    } as never);

    const { unmount: unmountModal } = render(
      <CreateGroupChatModal
        isOpen={true}
        onClose={vi.fn()}
        onCreated={vi.fn()}
        currentUserId={10}
        currentUserName="Alice User"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("create-group-chat-modal")).toBeInTheDocument();
      expect(screen.getByTestId("create-group-demo-notice")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("candidate-item-991")).not.toBeInTheDocument();
    expect(screen.queryByText("alex.rivera@taskpilot.local")).not.toBeInTheDocument();
    unmountModal();

    // User A (10) creates group and sends demo message on GlobalChatPage
    const getMeSpy = vi.spyOn(profileService, "getMe").mockResolvedValue({
      status: 200,
      message: "OK",
      data: {
        id: 10,
        email: "alice@taskpilot.local",
        fullName: "Alice User",
        role: "USER",
      },
    } as never);

    vi.spyOn(projectService, "getMyProjects").mockResolvedValue({
      status: 200,
      message: "OK",
      data: { content: [] },
    } as never);

    const { unmount: unmountPage } = render(
      <MemoryRouter initialEntries={["/chat"]}>
        <GlobalChatPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("btn-open-create-group")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("btn-open-create-group"));
    await waitFor(() => {
      expect(screen.getByTestId("input-group-name")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId("input-group-name"), {
      target: { value: "Alice Local Demo Group" },
    });
    fireEvent.click(screen.getByTestId("btn-submit-create-group"));

    await waitFor(() => {
      expect(screen.getByTestId("custom-group-chat-view")).toBeInTheDocument();
      expect(screen.getByTestId("custom-group-demo-banner")).toBeInTheDocument();
      expect(screen.getByTestId("chat-demo-mode-badge")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId("group-chat-input"), {
      target: { value: "Alice secret demo note" },
    });
    fireEvent.click(screen.getByTestId("group-chat-send-btn"));

    await waitFor(() => {
      expect(screen.getByText("Alice secret demo note")).toBeInTheDocument();
    });

    // Logout clears transient view immediately
    act(() => {
      useAuthStore.setState({
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        role: null,
        user: null,
      });
    });

    await waitFor(() => {
      expect(screen.queryByText("Alice secret demo note")).not.toBeInTheDocument();
      expect(screen.queryByText("Alice Local Demo Group")).not.toBeInTheDocument();
    });

    // Switch to User B (20) -> sees zero of Alice's groups/messages or legacy unscoped keys
    getMeSpy.mockResolvedValue({
      status: 200,
      message: "OK",
      data: {
        id: 20,
        email: "bob@taskpilot.local",
        fullName: "Bob User",
        role: "USER",
      },
    } as never);

    act(() => {
      useAuthStore.setState({
        accessToken: "tok-20",
        refreshToken: "ref-20",
        isAuthenticated: true,
        role: "USER",
        user: {
          id: 20,
          email: "bob@taskpilot.local",
          fullName: "Bob User",
          avatarUrl: null,
          role: "USER",
          status: "AVAILABLE",
          currentWorkload: 0,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("global-chat-empty")).toBeInTheDocument();
    });
    expect(screen.queryByText("Alice Local Demo Group")).not.toBeInTheDocument();
    expect(screen.queryByText("Alice secret demo note")).not.toBeInTheDocument();
    expect(screen.queryByText("Legacy Unscoped Group")).not.toBeInTheDocument();
    expect(localStorage.getItem(LEGACY_GROUPS_KEY)).toBe(LEGACY_GROUPS_BYTES);
    expect(localStorage.getItem(LEGACY_MSG_KEY)).toBe(LEGACY_MSG_BYTES);

    unmountPage();
  });
});
