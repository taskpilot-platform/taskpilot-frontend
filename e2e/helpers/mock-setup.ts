import { Page } from "@playwright/test";

export interface MockUser {
  id: number;
  email: string;
  fullName: string;
  role: string;
}

export const DEFAULT_MOCK_USER: MockUser = {
  id: 1,
  email: "alex.manager@taskpilot.local",
  fullName: "Alex Rivera",
  role: "ADMIN",
};

export const TEAMMATE_USER: MockUser = {
  id: 2,
  email: "sarah.dev@taskpilot.local",
  fullName: "Sarah Connor",
  role: "MEMBER",
};

// Valid JWT token with 3 parts and future exp (year 2100)
export const VALID_MOCK_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbGV4Lm1hbmFnZXJAdGFza3BpbG90LmxvY2FsIiwiZXhwIjo0MTAyNDQ0ODAwLCJpYXQiOjE3MDAwMDAwMDB9.mock_signature";

export async function setupWorkspaceMocks(
  page: Page,
  options: {
    user?: MockUser;
    isManager?: boolean;
    isArchived?: boolean;
    initialFiles?: any[];
    initialMessages?: any[];
    initialMeetings?: any[];
  } = {}
) {
  const user = options.user || DEFAULT_MOCK_USER;
  const isManager = options.isManager ?? true;
  const isArchived = options.isArchived ?? false;
  let files = options.initialFiles || [];
  let messages = options.initialMessages || [];
  let meetings = options.initialMeetings || [];

  // Seed localStorage with valid auth token before page load
  await page.addInitScript(
    ({ token, userData }) => {
      localStorage.setItem("taskpilot_access_token", token);
      localStorage.setItem("taskpilot_refresh_token", token);
      localStorage.setItem("auth_token", token);
      localStorage.setItem("user", JSON.stringify(userData));
    },
    { token: VALID_MOCK_JWT, userData: user }
  );

  // Mock Notifications stream & APIs (SSE & REST)
  await page.route("**/notifications/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/stream")) {
      await route.fulfill({
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
        body: "event: notification.unread-count\ndata: 0\n\n",
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: 200,
        message: "Success",
        data: { content: [], unreadCount: 0, totalElements: 0 },
      }),
    });
  });

  // Mock Profile API
  await page.route("**/api/v1/users/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: 200,
        message: "Success",
        data: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          avatarUrl: null,
          role: user.role,
          status: "ACTIVE",
          currentWorkload: 3,
          createdAt: "2026-09-01T00:00:00Z",
          updatedAt: "2026-09-01T00:00:00Z",
        },
      }),
    });
  });

  // Mock Project Details
  await page.route("**/api/v1/projects/100", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: 200,
        message: "Success",
        data: {
          id: 100,
          name: "TaskPilot Collaboration Workspace",
          description: "Full Phase 3 workspace test environment",
          status: isArchived ? "ARCHIVED" : "ACTIVE",
          heuristicMode: "BALANCED",
          createdAt: "2026-09-01T00:00:00Z",
          startDate: "2026-09-01T00:00:00Z",
          endDate: "2026-12-31T00:00:00Z",
        },
      }),
    });
  });

  // Mock My Projects
  await page.route("**/api/v1/projects/my**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: 200,
        message: "Success",
        data: {
          content: [
            {
              id: 100,
              name: "TaskPilot Collaboration Workspace",
              description: "Full Phase 3 workspace test environment",
              status: isArchived ? "ARCHIVED" : "ACTIVE",
              role: isManager ? "MANAGER" : "MEMBER",
              heuristicMode: "BALANCED",
              startDate: "2026-09-01T00:00:00Z",
              endDate: "2026-12-31T00:00:00Z",
              memberCount: 2,
              activeTaskCount: 5,
              totalTaskCount: 12,
            },
          ],
          totalElements: 1,
          totalPages: 1,
          size: 100,
          number: 0,
        },
      }),
    });
  });

  // Mock Project Members
  await page.route("**/api/v1/projects/100/members", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: 200,
        message: "Success",
        data: [
          {
            userId: user.id,
            fullName: user.fullName,
            email: user.email,
            role: isManager ? "MANAGER" : "MEMBER",
          },
          {
            userId: TEAMMATE_USER.id,
            fullName: TEAMMATE_USER.fullName,
            email: TEAMMATE_USER.email,
            role: "MEMBER",
          },
        ],
      }),
    });
  });

  // Mock Project Summary
  await page.route("**/api/v1/projects/100/summary", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: 200,
        message: "Success",
        data: {
          totalTasks: 12,
          completedTasks: 8,
          inProgressTasks: 3,
          pendingTasks: 1,
          completionRate: 67,
        },
      }),
    });
  });

  // Mock Board / Sprints / Tasks endpoints
  await page.route("**/api/v1/projects/100/board", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: 200,
        message: "Success",
        data: {
          projectId: 100,
          workflowMode: "KANBAN",
          columns: [],
          tasks: [],
          activeSprint: null,
        },
      }),
    });
  });

  await page.route("**/api/v1/projects/100/tasks**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: 200,
        message: "Success",
        data: [],
      }),
    });
  });

  await page.route("**/api/v1/projects/100/sprints**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: 200,
        message: "Success",
        data: [],
      }),
    });
  });

  // Mock Files API
  await page.route("**/api/v1/projects/100/files**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "GET") {
      const keyword = url.searchParams.get("keyword")?.toLowerCase();
      let filtered = [...files];
      if (keyword) {
        filtered = filtered.filter(
          (f) =>
            f.fileName.toLowerCase().includes(keyword) ||
            f.originalName?.toLowerCase().includes(keyword)
        );
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "Success",
          data: {
            content: filtered,
            totalElements: filtered.length,
            totalPages: 1,
            size: 20,
            number: 0,
          },
        }),
      });
      return;
    }

    if (request.method() === "POST") {
      // Mock File Upload
      const newFile = {
        id: files.length + 1,
        projectId: 100,
        uploaderId: user.id,
        uploaderName: user.fullName,
        fileName: "uploaded_test_file.pdf",
        originalName: "uploaded_test_file.pdf",
        fileSize: 1024 * 350,
        contentType: "application/pdf",
        storageKey: `projects/100/files/uuid_${Date.now()}_test.pdf`,
        storageBucket: "documents",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      files.unshift(newFile);
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          status: 201,
          message: "File uploaded successfully",
          data: newFile,
        }),
      });
      return;
    }

    if (request.method() === "DELETE") {
      const fileIdMatch = url.pathname.match(/\/files\/(\d+)/);
      if (fileIdMatch) {
        const idToDelete = Number(fileIdMatch[1]);
        files = files.filter((f) => f.id !== idToDelete);
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "File deleted successfully",
          data: null,
        }),
      });
      return;
    }

    await route.continue();
  });

  // Mock Chat Messages API
  await page.route("**/api/v1/projects/100/chat/messages**", async (route) => {
    const request = route.request();

    if (request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "Success",
          data: {
            content: [...messages],
            totalElements: messages.length,
            totalPages: 1,
            number: 0,
            size: 50,
          },
        }),
      });
      return;
    }

    if (request.method() === "POST") {
      const postData = JSON.parse(request.postData() || "{}");
      const newMsg = {
        id: messages.length + 1,
        projectId: 100,
        senderId: user.id,
        senderName: user.fullName,
        messageType: postData.messageType || "TEXT",
        content: postData.content,
        fileId: postData.fileId || null,
        fileName: postData.fileName || null,
        createdAt: new Date().toISOString(),
      };
      messages.push(newMsg);
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          status: 201,
          message: "Message sent",
          data: newMsg,
        }),
      });
      return;
    }

    await route.continue();
  });

  // Mock Active Meeting API
  await page.route(/\/api\/v1\/projects\/100\/meetings\/active(\?.*)?$/, async (route) => {
    const active = meetings.find((m: any) => m.status === "ACTIVE") || null;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: 200,
        message: "Success",
        data: active,
      }),
    });
  });

  // Mock Join Meeting API
  await page.route(/\/api\/v1\/projects\/100\/meetings\/\d+\/join(\?.*)?$/, async (route) => {
    const url = route.request().url();
    const match = url.match(/\/meetings\/(\d+)\/join/);
    const meetingId = match ? parseInt(match[1]) : 1;
    const meeting = meetings.find((m: any) => m.id === meetingId) || {
      id: meetingId,
      projectId: 100,
      title: "Sprint Planning",
      status: "ACTIVE",
      roomName: `tp-room-${meetingId}`,
      startedAt: new Date().toISOString(),
      hostName: user.fullName,
      hostId: user.id,
      recordingEnabled: false,
      activeParticipantsCount: 1,
      totalParticipantsCount: 1,
      isHost: true,
    };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: 200,
        message: "Joined successfully",
        data: {
          token: "mock-livekit-token-" + meetingId,
          livekitUrl: "wss://taskpilot-collab-m3oqfj4g.livekit.cloud",
          roomName: meeting.roomName,
          identity: `user_${user.id}`,
          participantName: user.fullName,
          isHost: meeting.hostId === user.id || isManager,
          meeting,
        },
      }),
    });
  });

  // Mock Leave Meeting API
  await page.route(/\/api\/v1\/projects\/100\/meetings\/\d+\/leave(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: 200,
        message: "Left successfully",
        data: null,
      }),
    });
  });

  // Mock End Meeting API
  await page.route(/\/api\/v1\/projects\/100\/meetings\/\d+\/end(\?.*)?$/, async (route) => {
    const url = route.request().url();
    const match = url.match(/\/meetings\/(\d+)\/end/);
    const meetingId = match ? parseInt(match[1]) : 1;
    const meeting = meetings.find((m: any) => m.id === meetingId);
    if (meeting) {
      meeting.status = "ENDED";
      meeting.endedAt = new Date().toISOString();
      meeting.durationSeconds = 120;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: 200,
        message: "Meeting ended",
        data: meeting || null,
      }),
    });
  });

  // Mock Meeting Participants API
  await page.route(/\/api\/v1\/projects\/100\/meetings\/\d+\/participants(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: 200,
        message: "Success",
        data: [
          {
            id: 1,
            meetingId: 1,
            userId: user.id,
            name: user.fullName,
            role: "HOST",
            joinedAt: new Date().toISOString(),
            isActive: true,
          },
        ],
      }),
    });
  });

  // Mock Meetings List & Create API
  await page.route(/\/api\/v1\/projects\/100\/meetings(\?.*)?$/, async (route) => {
    const request = route.request();

    if (request.method() === "GET") {
      const url = new URL(request.url());
      const statusParam = url.searchParams.get("status");
      let filtered = [...meetings];
      if (statusParam) {
        filtered = filtered.filter((m: any) => m.status === statusParam);
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "Success",
          data: filtered,
        }),
      });
      return;
    }

    if (request.method() === "POST") {
      const postData = JSON.parse(request.postData() || "{}");
      const newMeeting = {
        id: meetings.length + 1,
        projectId: 100,
        hostId: user.id,
        hostName: user.fullName,
        title: postData.title,
        description: postData.description || null,
        roomName: `tp-proj-100-m-${Date.now()}`,
        status: "ACTIVE",
        recordingEnabled: !!postData.recordingEnabled,
        startedAt: new Date().toISOString(),
        activeParticipantsCount: 1,
        totalParticipantsCount: 1,
        isHost: true,
      };
      meetings.unshift(newMeeting);
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          status: 201,
          message: "Meeting created",
          data: newMeeting,
        }),
      });
      return;
    }

    await route.continue();
  });
}
