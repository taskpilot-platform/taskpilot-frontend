import { test, expect, type Page } from "@playwright/test";
import { setupWorkspaceMocks, VALID_MOCK_JWT } from "./helpers/mock-setup";

const LEGACY_GROUPS_KEY = "taskpilot_custom_group_chats";
const LEGACY_MSG_KEY = "taskpilot_custom_chat_msg_grp-legacy-1";
const LEGACY_GROUPS_BYTES = JSON.stringify([
  {
    id: "grp-legacy-1",
    name: "Legacy Unscoped Group",
    createdAt: "2026-10-01T00:00:00Z",
    createdBy: 99,
    members: [{ id: 99, name: "Legacy Owner", email: "legacy@taskpilot.local", role: "OWNER" }],
    lastMessage: "Legacy unscoped secret",
  },
]);
const LEGACY_MSG_BYTES = JSON.stringify([
  {
    id: 1,
    projectId: -1,
    senderId: 99,
    senderName: "Legacy Owner",
    content: "Legacy unscoped message body",
    messageType: "TEXT",
    createdAt: "2026-10-01T00:00:00Z",
  },
]);

const PROJECT_100 = {
  id: 100,
  name: "TaskPilot Collaboration Workspace",
  description: "Core workspace",
  status: "ACTIVE",
  myRole: "MANAGER",
  startDate: "2026-09-01T00:00:00Z",
  endDate: "2026-12-31T00:00:00Z",
};

const PROJECT_200 = {
  id: 200,
  name: "Mobile App Initiative",
  description: "Mobile experience",
  status: "ACTIVE",
  myRole: "MEMBER",
  startDate: "2026-10-01T00:00:00Z",
  endDate: "2026-12-31T00:00:00Z",
};

async function mockStompWebSocket(page: Page) {
  await page.routeWebSocket(/\/ws\/chat/, (ws) => {
    ws.onMessage((msg) => {
      if (typeof msg === "string" && msg.startsWith("CONNECT")) {
        ws.send("CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0");
      }
    });
  });
}

test.describe("P4.3 Collaboration Containment, Route Sync & Local Calendar", () => {
  test("hides custom groups despite legacy storage and ?group= query while keeping real project chat usable", async ({
    page,
  }) => {
    await mockStompWebSocket(page);
    await setupWorkspaceMocks(page, {
      language: "en",
      initialMessages: [
        {
          id: 11,
          projectId: 100,
          senderId: 2,
          senderName: "Sarah Connor",
          messageType: "TEXT",
          content: "Project 100 real STOMP chat works",
          createdAt: "2026-11-15T08:00:00Z",
        },
      ],
    });

    await page.addInitScript(
      ({ gKey, gVal, mKey, mVal }) => {
        localStorage.setItem(gKey, gVal);
        localStorage.setItem(mKey, mVal);
      },
      {
        gKey: LEGACY_GROUPS_KEY,
        gVal: LEGACY_GROUPS_BYTES,
        mKey: LEGACY_MSG_KEY,
        mVal: LEGACY_MSG_BYTES,
      },
    );

    await page.goto("/chat?group=grp-legacy-1");
    await expect(page.getByTestId("global-chat-page")).toBeVisible({ timeout: 10000 });

    // Custom group UI & legacy records are completely hidden
    await expect(page.getByTestId("btn-open-create-group")).toHaveCount(0);
    await expect(page.getByTestId("custom-group-chat-view")).toHaveCount(0);
    await expect(page.getByTestId("group-item-grp-legacy-1")).toHaveCount(0);
    await expect(page.getByText("Legacy Unscoped Group")).toHaveCount(0);
    await expect(page.getByText("Legacy unscoped message body")).toHaveCount(0);

    // Real project chat falls back cleanly and works
    await expect(page.getByTestId("channel-item-100")).toBeVisible();
    await expect(page.getByText("Project 100 real STOMP chat works")).toBeVisible();

    // Legacy localStorage bytes remain untouched
    const stored = await page.evaluate(
      ({ gKey, mKey }) => ({
        groups: localStorage.getItem(gKey),
        msgs: localStorage.getItem(mKey),
      }),
      { gKey: LEGACY_GROUPS_KEY, mKey: LEGACY_MSG_KEY },
    );
    expect(stored.groups).toBe(LEGACY_GROUPS_BYTES);
    expect(stored.msgs).toBe(LEGACY_MSG_BYTES);
  });

  test("clears transient view on logout and isolates accounts on switch without importing legacy data", async ({
    page,
  }) => {
    await mockStompWebSocket(page);

    let activeAccount: "A" | "B" = "A";

    await page.addInitScript(
      ({ token, gKey, gVal, mKey, mVal }) => {
        if (!sessionStorage.getItem("p4_e2e_seeded")) {
          sessionStorage.setItem("p4_e2e_seeded", "1");
          localStorage.setItem("i18nextLng", "en");
          localStorage.setItem("taskpilot_access_token", token);
          localStorage.setItem("taskpilot_refresh_token", "refresh-a");
          localStorage.setItem(gKey, gVal);
          localStorage.setItem(mKey, mVal);
        }
      },
      {
        token: VALID_MOCK_JWT,
        gKey: LEGACY_GROUPS_KEY,
        gVal: LEGACY_GROUPS_BYTES,
        mKey: LEGACY_MSG_KEY,
        mVal: LEGACY_MSG_BYTES,
      },
    );

    await page.route("**/notifications/**", async (route) => {
      if (route.request().url().includes("/stream")) {
        await route.fulfill({
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
          body: "event: notification.unread-count\ndata: 0\n\n",
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: 200, message: "OK", data: 0 }),
      });
    });

    await page.route("**/v1/users/me", async (route) => {
      const user =
        activeAccount === "A"
          ? { id: 10, email: "alice@taskpilot.local", fullName: "Alice A", role: "USER", status: "ACTIVE" }
          : { id: 20, email: "bob@taskpilot.local", fullName: "Bob B", role: "USER", status: "ACTIVE" };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: 200, message: "OK", data: user }),
      });
    });

    await page.route("**/v1/auth/oauth2/providers**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: 200, message: "OK", data: [] }),
      });
    });

    await page.route("**/v1/users/me/skills**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: 200, message: "OK", data: [] }),
      });
    });

    await page.route("**/v1/auth/logout", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: 200, message: "Logged out", data: null }),
      });
    });

    await page.route("**/v1/auth/login", async (route) => {
      activeAccount = "B";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "OK",
          data: {
            outcome: "AUTHENTICATED",
            token: VALID_MOCK_JWT,
            refreshToken: "refresh-b",
          },
        }),
      });
    });

    await page.route("**/v1/projects/my**", async (route) => {
      const list =
        activeAccount === "A"
          ? [{ id: 100, name: "Alice Project Alpha", status: "ACTIVE", myRole: "MANAGER" }]
          : [{ id: 300, name: "Bob Project Omega", status: "ACTIVE", myRole: "MEMBER" }];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: 200, message: "OK", data: { content: list } }),
      });
    });

    await page.route("**/v1/projects/*/chat/messages**", async (route) => {
      const url = route.request().url();
      const content = url.includes("/100/")
        ? [
            {
              id: 1,
              projectId: 100,
              senderId: 10,
              senderName: "Alice A",
              messageType: "TEXT",
              content: "Alice private message",
              createdAt: "2026-11-15T09:00:00Z",
            },
          ]
        : [
            {
              id: 2,
              projectId: 300,
              senderId: 20,
              senderName: "Bob B",
              messageType: "TEXT",
              content: "Bob isolated message",
              createdAt: "2026-11-15T09:05:00Z",
            },
          ];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: 200, message: "OK", data: { content } }),
      });
    });

    await page.goto("/chat?project=100");
    await expect(page.getByTestId("active-channel-name")).toContainText("Alice Project Alpha", {
      timeout: 10000,
    });
    await expect(page.getByText("Alice private message")).toBeVisible();

    // Logout from sidebar button
    await page.locator("aside button", { hasText: /Log\s*Out|Logout|Sign Out|Đăng xuất/i }).click();
    await page.waitForURL(/\/login/, { timeout: 10000 });

    // Legacy keys still intact after logout
    const afterLogout = await page.evaluate(
      ({ gKey, mKey }) => ({
        groups: localStorage.getItem(gKey),
        msgs: localStorage.getItem(mKey),
      }),
      { gKey: LEGACY_GROUPS_KEY, mKey: LEGACY_MSG_KEY },
    );
    expect(afterLogout.groups).toBe(LEGACY_GROUPS_BYTES);
    expect(afterLogout.msgs).toBe(LEGACY_MSG_BYTES);

    // Sign in as User B
    await page.locator("#email").fill("bob@taskpilot.local");
    await page.locator("#password").fill("Password123!");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    await page.goto("/chat");
    await expect(page.getByTestId("active-channel-name")).toContainText("Bob Project Omega", {
      timeout: 10000,
    });
    await expect(page.getByText("Bob isolated message")).toBeVisible();
    await expect(page.getByText("Alice Project Alpha")).toHaveCount(0);
    await expect(page.getByText("Alice private message")).toHaveCount(0);
    await expect(page.getByText("Legacy Unscoped Group")).toHaveCount(0);
  });

  test("switches projects cleanly on mounted GlobalChatPage including back/forward and cancels stale project 100 response", async ({
    page,
  }) => {
    await mockStompWebSocket(page);
    await setupWorkspaceMocks(page, { language: "en" });

    let releaseDelayed100!: () => void;
    const delayed100Gate = new Promise<void>((resolve) => {
      releaseDelayed100 = resolve;
    });
    let first100Request = true;

    await page.route("**/v1/projects/my**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "OK",
          data: { content: [PROJECT_100, PROJECT_200] },
        }),
      });
    });

    await page.route("**/v1/projects/100/chat/messages**", async (route) => {
      if (first100Request) {
        first100Request = false;
        await delayed100Gate;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: 200,
            message: "OK",
            data: {
              content: [
                {
                  id: 999,
                  projectId: 100,
                  senderId: 2,
                  senderName: "Stale",
                  messageType: "TEXT",
                  content: "STALE_LATE_100_MESSAGE",
                  createdAt: "2026-11-15T08:00:00Z",
                },
              ],
            },
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "OK",
          data: {
            content: [
              {
                id: 101,
                projectId: 100,
                senderId: 2,
                senderName: "Alex",
                messageType: "TEXT",
                content: "Fresh 100 message after back",
                createdAt: "2026-11-15T08:01:00Z",
              },
            ],
          },
        }),
      });
    });

    await page.route("**/v1/projects/200/chat/messages**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "OK",
          data: {
            content: [
              {
                id: 201,
                projectId: 200,
                senderId: 2,
                senderName: "Sarah",
                messageType: "TEXT",
                content: "Project 200 message",
                createdAt: "2026-11-15T08:02:00Z",
              },
            ],
          },
        }),
      });
    });

    await page.goto("/chat?project=100");
    await expect(page.getByTestId("channel-item-200")).toBeVisible({ timeout: 10000 });

    // Switch to project 200 while project 100 request is still in flight
    await page.getByTestId("channel-item-200").click();
    await expect(page).toHaveURL(/project=200/);
    await expect(page.getByTestId("active-channel-name")).toContainText("Mobile App Initiative");
    await expect(page.getByText("Project 200 message")).toBeVisible();

    // Release stale 100 response -> must NOT appear
    releaseDelayed100();
    await page.waitForTimeout(200);
    await expect(page.getByText("STALE_LATE_100_MESSAGE")).toHaveCount(0);
    await expect(page.getByText("Project 200 message")).toBeVisible();

    // Browser Back -> returns to project 100, Forward -> returns to project 200
    await page.goBack();
    await expect(page).toHaveURL(/project=100/);
    await expect(page.getByTestId("active-channel-name")).toContainText("TaskPilot Collaboration Workspace");
    await expect(page.getByText("Fresh 100 message after back")).toBeVisible();

    await page.goForward();
    await expect(page).toHaveURL(/project=200/);
    await expect(page.getByTestId("active-channel-name")).toContainText("Mobile App Initiative");
  });

  test.describe("Asia/Bangkok local calendar grouping", () => {
    test.use({ timezoneId: "Asia/Bangkok" });

    test("groups 2026-11-14T18:00:00Z on Nov 15 across agenda and month grid in Asia/Bangkok", async ({
      page,
    }) => {
      await page.clock.install({ time: new Date("2026-11-15T01:10:00+07:00") });
      await setupWorkspaceMocks(page, {
        language: "en",
        initialMeetings: [
          {
            id: 701,
            projectId: 100,
            title: "Bangkok 01:00 AM Sync",
            description: "Midnight UTC+7 test",
            status: "SCHEDULED",
            recordingEnabled: false,
            hostId: 1,
            hostName: "Alex Rivera",
            roomName: "room-701",
            scheduledStartTime: "2026-11-14T18:00:00Z",
            startedAt: null,
            endedAt: null,
            durationSeconds: 0,
            activeParticipantsCount: 0,
            totalParticipantsCount: 1,
            isHost: true,
          },
        ],
      });

      await page.route(/\/(?:api\/)?v1\/(?:projects\/100\/)?tasks(\?.*)?$/, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: 200,
            message: "OK",
            data: [
              {
                id: 801,
                title: "Nov 15 Date-Only Task",
                priority: "HIGH",
                status: "TODO",
                dueDate: "2026-11-15",
              },
            ],
          }),
        });
      });

      await page.goto("/calendar?project=100");
      await expect(page.getByTestId("global-calendar-page")).toBeVisible({ timeout: 10000 });

      // Agenda for today (Nov 15 in Bangkok) shows both the 18:00Z meeting and date-only task
      await expect(page.getByTestId("calendar-meeting-card-701")).toBeVisible();
      await expect(page.getByText("Bangkok 01:00 AM Sync")).toBeVisible();
      await expect(page.getByTestId("calendar-task-card-801")).toBeVisible();

      // Month view places both inside cell 2026-11-15, not 2026-11-14
      await page.getByTestId("calendar-month-view-btn").click();
      await expect(page.getByTestId("calendar-cell-2026-11-15")).toContainText("Bangkok 01:00 AM Sync");
      await expect(page.getByTestId("calendar-cell-2026-11-15")).toContainText("Nov 15 Date-Only Task");
      await expect(page.getByTestId("calendar-cell-2026-11-14")).not.toContainText("Bangkok 01:00 AM Sync");
    });
  });
});
