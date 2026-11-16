import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AcceptInvitationPage from "@/pages/AcceptInvitationPage";
import ProjectSettingsPage from "@/pages/ProjectSettingsPage";
import ProjectsPage from "@/pages/ProjectsPage";
import { labelService } from "@/services/label.service";
import { profileService } from "@/services/profile.service";
import { projectService } from "@/services/project.service";
import { useAuthStore } from "@/stores/auth.store";
import i18n from "i18next";

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("P2 Frontend Private Project Invitations", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    vi.clearAllMocks();
  });

  it("ProjectSettingsPage removes PRJ-ID box and supports private invitations & revocation", async () => {
    vi.spyOn(projectService, "getProjectDetail").mockResolvedValue({
      status: 200,
      message: "OK",
      data: {
        id: 12,
        name: "Alpha Private",
        description: "Desc",
        status: "ACTIVE",
        heuristicMode: "BALANCED",
        workflowMode: "KANBAN",
        startDate: null,
        endDate: null,
        createdAt: "2026-01-01T00:00:00Z",
      },
    });
    vi.spyOn(projectService, "getProjectMembers").mockResolvedValue({
      status: 200,
      message: "OK",
      data: [
        {
          projectId: 12,
          userId: 1,
          fullName: "Manager",
          email: "mgr@example.com",
          avatarUrl: null,
          role: "MANAGER",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
    });
    vi.spyOn(labelService, "getProjectLabels").mockResolvedValue({
      status: 200,
      message: "OK",
      data: [],
    });
    vi.spyOn(profileService, "getMe").mockResolvedValue({
      status: 200,
      message: "OK",
      data: {
        id: 1,
        email: "mgr@example.com",
        fullName: "Manager",
        avatarUrl: null,
        role: "USER",
        status: "AVAILABLE",
        currentWorkload: 0,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    });
    vi.spyOn(projectService, "listInvitations").mockResolvedValue({
      status: 200,
      message: "OK",
      data: [
        {
          id: 50,
          projectId: 12,
          inviteeEmail: "pending@example.com",
          invitedByUserId: 1,
          status: "PENDING",
          issuedAt: "2026-01-01T00:00:00Z",
          expiresAt: "2026-01-08T00:00:00Z",
          consumedAt: null,
          revokedAt: null,
          revocationReason: null,
        },
      ],
    });
    const createInvSpy = vi.spyOn(projectService, "createInvitation").mockResolvedValue({
      status: 201,
      message: "Created",
      data: {
        id: 51,
        projectId: 12,
        inviteeEmail: "invitee@example.com",
        issuedAt: "2026-01-01T00:00:00Z",
        expiresAt: "2026-01-08T00:00:00Z",
        inviteToken: "secret-invite-token",
        inviteUrl: "http://localhost:5173/invitations/accept?token=secret-invite-token",
      },
    });
    const revokeSpy = vi.spyOn(projectService, "revokeInvitation").mockResolvedValue({
      status: 200,
      message: "OK",
      data: null,
    });

    render(
      <MemoryRouter initialEntries={["/projects/12/settings"]}>
        <Routes>
          <Route path="/projects/:projectId/settings" element={<ProjectSettingsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Private Email-Bound Invitations/i)).toBeInTheDocument();
      expect(screen.queryByText("PRJ-12")).not.toBeInTheDocument();
      expect(screen.getByText("pending@example.com")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("teammate@example.com"), {
      target: { value: "invitee@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create Invite Link/i }));

    await waitFor(() => {
      expect(createInvSpy).toHaveBeenCalledWith(12, { email: "invitee@example.com" });
      expect(screen.getByText(/secret-invite-token/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Revoke/i }));
    await waitFor(() => {
      expect(revokeSpy).toHaveBeenCalledWith(12, 50);
    });
  });

  it("AcceptInvitationPage accepts invitation token for signed-in user", async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: 2,
        email: "invitee@example.com",
        fullName: "Invitee",
        avatarUrl: null,
        role: "USER",
        status: "AVAILABLE",
        currentWorkload: 0,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    });
    const acceptSpy = vi.spyOn(projectService, "acceptInvitation").mockResolvedValue({
      status: 200,
      message: "OK",
      data: {
        projectId: 12,
        userId: 2,
        fullName: "Invitee",
        email: "invitee@example.com",
        avatarUrl: null,
        role: "MEMBER",
        joinedAt: "2026-01-02T00:00:00Z",
      },
    });

    render(
      <MemoryRouter initialEntries={["/invitations/accept?token=tok-abc"]}>
        <Routes>
          <Route path="/invitations/accept" element={<AcceptInvitationPage />} />
          <Route path="/projects/12" element={<div>Project 12 Target</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Accept Invitation/i }));
    await waitFor(() => {
      expect(acceptSpy).toHaveBeenCalledWith({ token: "tok-abc" });
      expect(screen.getByText("Project 12 Target")).toBeInTheDocument();
    });
  });

  it("ProjectsPage extracts invitation token from pasted URL instead of calling legacy join", async () => {
    vi.spyOn(projectService, "getMyProjects").mockResolvedValue({
      status: 200,
      message: "OK",
      data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 10, first: true, last: true },
    });
    const acceptSpy = vi.spyOn(projectService, "acceptInvitation").mockResolvedValue({
      status: 200,
      message: "OK",
      data: {
        projectId: 15,
        userId: 2,
        fullName: "Invitee",
        email: "invitee@example.com",
        avatarUrl: null,
        role: "MEMBER",
        joinedAt: "2026-01-02T00:00:00Z",
      },
    });

    render(
      <MemoryRouter initialEntries={["/projects"]}>
        <ProjectsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Create Project/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Create Project/i }));
    fireEvent.change(screen.getByPlaceholderText(/Paste invitation link/i), {
      target: { value: "http://localhost:5173/invitations/accept?token=pasted-tok-99" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Accept Invitation/i }));

    await waitFor(() => {
      expect(acceptSpy).toHaveBeenCalledWith({ token: "pasted-tok-99" });
    });
  });
});
