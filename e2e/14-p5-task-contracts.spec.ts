import { test, expect } from "./helpers/isolated-test";
import { setupWorkspaceMocks } from "./helpers/mock-setup";

test.describe("P5-01 Task Mutation & Timezone Contracts (Mocked E2E)", () => {
  test("displays project-zone task dates, sends expectedTaskVersion + explicit null clear, refreshes on 409, and shows exact summary counts", async ({
    page,
  }) => {
    await setupWorkspaceMocks(page, { language: "en", isManager: true });

    await page.route("**/v1/projects/100", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "Success",
          data: {
            id: 100,
            name: "Web App Core",
            description: "P5 timezone project",
            status: "ACTIVE",
            heuristicMode: "BALANCED",
            workflowMode: "KANBAN",
            startDate: "2026-11-01",
            endDate: "2026-12-31",
            timezoneId: "Asia/Ho_Chi_Minh",
            timezoneProvenance: "PROJECT_DEFAULT",
            createdAt: "2026-11-01T00:00:00Z",
          },
        }),
      });
    });

    await page.route("**/v1/projects/100/summary", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "Success",
          data: {
            projectId: 100,
            projectName: "Web App Core",
            totalMembers: 2,
            totalTasks: 10,
            todoTasks: 3,
            inProgressTasks: 2,
            reviewTasks: 4,
            doneTasks: 1,
            completionRate: 10,
          },
        }),
      });
    });

    let currentTask = {
      id: 75,
      projectId: 100,
      title: "Timezone Contract Task",
      description: "Verify explicit null clears",
      status: "TODO",
      priority: "HIGH",
      position: 0,
      labels: [],
      difficultyLevel: 3,
      assigneeId: 2,
      reporterId: 1,
      startDate: "2026-11-14T17:00:00Z",
      dueDate: "2026-11-15T16:59:59.999999Z",
      createdAt: "2026-11-14T00:00:00Z",
      updatedAt: "2026-11-14T00:00:00Z",
      version: 2,
      assignmentVersion: 1,
      projectTimezoneId: "Asia/Ho_Chi_Minh",
    };

    const capturedPatches: Array<{ body: Record<string, unknown>; idempotencyKey?: string }> = [];
    let shouldConflictNextPatch = false;

    await page.route("**/v1/tasks/75", async (route) => {
      const method = route.request().method();
      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: 200,
            message: "Success",
            data: {
              task: currentTask,
              assignee: { id: 2, fullName: "Sarah Connor", email: "sarah@taskpilot.local" },
              reporter: { id: 1, fullName: "Alex Rivera", email: "alex@taskpilot.local" },
              subtasks: [],
              requiredSkills: [],
            },
          }),
        });
        return;
      }

      if (method === "PATCH") {
        const body = route.request().postDataJSON() as Record<string, unknown>;
        const headers = await route.request().allHeaders();
        capturedPatches.push({
          body,
          idempotencyKey: headers["idempotency-key"],
        });

        if (shouldConflictNextPatch) {
          shouldConflictNextPatch = false;
          currentTask = {
            ...currentTask,
            version: 5,
            dueDate: "2026-11-20T16:59:59.999999Z",
          };
          await route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({
              status: 409,
              message: "Task was modified concurrently",
            }),
          });
          return;
        }

        if (Object.prototype.hasOwnProperty.call(body, "dueDate")) {
          currentTask = {
            ...currentTask,
            dueDate: body.dueDate as string | null,
            version: currentTask.version + 1,
          };
        }

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: 200,
            message: "Task updated successfully",
            data: currentTask,
          }),
        });
        return;
      }

      await route.continue();
    });

    await page.route("**/v1/tasks/75/comments**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: 200, message: "Success", data: [] }),
      });
    });

    // 1. Overview shows exact ProjectSummary counts (todoTasks=3, inProgressTasks=2, reviewTasks=4, doneTasks=1)
    await page.goto("/projects/100/overview");
    await expect(page.getByRole("heading", { name: "Web App Core" }).first()).toBeVisible();
    const overviewSummary = page.locator("div.grid.grid-cols-2").filter({ hasText: "Review" }).first();
    await expect(overviewSummary).toContainText("4");
    await expect(overviewSummary).toContainText("3");
    await expect(overviewSummary).toContainText("2");
    await expect(overviewSummary).toContainText("1");

    // 2. Task Detail Page displays 2026-11-15 in Asia/Ho_Chi_Minh (NOT 2026-11-14 from UTC prefix)
    await page.goto("/projects/100/tasks/75");
    const startInput = page.getByLabel("Start Date");
    const dueInput = page.getByLabel("Due Date");
    await expect(startInput).toHaveValue("2026-11-15");
    await expect(dueInput).toHaveValue("2026-11-15");

    // 3. Clearing Due Date sends real explicit null, Idempotency-Key + requestId, and expectedTaskVersion=2
    await dueInput.fill("");
    await expect.poll(() => capturedPatches.length).toBe(1);
    expect(capturedPatches[0].body.expectedTaskVersion).toBe(2);
    expect(capturedPatches[0].idempotencyKey).toBeTruthy();
    expect(capturedPatches[0].body.requestId).toBe(capturedPatches[0].idempotencyKey);
    expect(Object.prototype.hasOwnProperty.call(capturedPatches[0].body, "dueDate")).toBe(true);
    expect(capturedPatches[0].body.dueDate).toBeNull();

    // 4. Stale version triggers 409 -> client refreshes latest server state (dueDate=2026-11-20 in HCM)
    shouldConflictNextPatch = true;
    await dueInput.fill("2026-11-18");
    await expect.poll(() => capturedPatches.length).toBe(2);
    expect(capturedPatches[1].body.expectedTaskVersion).toBe(3);
    expect(capturedPatches[1].idempotencyKey).toBeTruthy();
    expect(capturedPatches[1].idempotencyKey).not.toBe(capturedPatches[0].idempotencyKey);
    await expect(dueInput).toHaveValue("2026-11-20");
  });

  test("blocks missing observed task version without synthesizing 0 and surfaces alert on unsupported project zone", async ({
    page,
  }) => {
    await setupWorkspaceMocks(page, { language: "en", isManager: true });

    let projectTimezone = "Asia/Ho_Chi_Minh";
    await page.route("**/v1/projects/100", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "Success",
          data: {
            id: 100,
            name: "Web App Core",
            status: "ACTIVE",
            workflowMode: "KANBAN",
            timezoneId: projectTimezone,
          },
        }),
      });
    });

    let getCount = 0;
    let patchCount = 0;
    await page.route("**/v1/tasks/76", async (route) => {
      if (route.request().method() === "PATCH") {
        patchCount += 1;
      }
      if (route.request().method() === "GET") {
        getCount += 1;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: 200,
            message: "Success",
            data: {
              task: {
                id: 76,
                projectId: 100,
                title: "Missing Version Task",
                status: "TODO",
                priority: "HIGH",
                position: 0,
                labels: [],
                dueDate: "2026-11-15T16:59:59.999999Z",
                projectTimezoneId: "Asia/Ho_Chi_Minh",
              },
              assignee: null,
              reporter: null,
              subtasks: [],
              requiredSkills: [],
            },
          }),
        });
        return;
      }
      await route.continue();
    });
    await page.route("**/v1/tasks/76/comments**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: 200, data: [] }) });
    });

    await page.goto("/projects/100/tasks/76");
    const dueInput76 = page.getByLabel("Due Date");
    await expect(dueInput76).toHaveValue("2026-11-15");
    const initialGets = getCount;
    await dueInput76.fill("2026-11-19");
    await expect(page.getByText(/missing or stale/i)).toBeVisible();
    await expect.poll(() => getCount).toBeGreaterThan(initialGets);
    expect(patchCount).toBe(0);

    projectTimezone = "UTC+07:00";
    await page.route("**/v1/tasks/77", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "Success",
          data: {
            task: {
              id: 77,
              projectId: 100,
              title: "Legacy Zone Task",
              status: "TODO",
              priority: "HIGH",
              position: 0,
              labels: [],
              dueDate: "2026-11-15T16:59:59.999999Z",
              version: 1,
              projectTimezoneId: "UTC+07:00",
            },
            assignee: null,
            reporter: null,
            subtasks: [],
            requiredSkills: [],
          },
        }),
      });
    });
    await page.route("**/v1/tasks/77/comments**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: 200, data: [] }) });
    });

    await page.goto("/projects/100/tasks/77");
    await expect(page.getByRole("alert")).toContainText("UTC+07:00");
    await expect(page.getByLabel("Due Date")).toBeDisabled();
  });

  async function runMultiViewerCalendarScenario(page: import("@playwright/test").Page, expectMeetingDay: "2026-11-15" | "2026-11-16") {
    await page.clock.install({ time: new Date("2026-11-15T06:00:00Z") });
    await setupWorkspaceMocks(page, {
      language: "en",
      initialMeetings: [
        {
          id: 901,
          projectId: 100,
          title: "12:00 UTC Global Sync",
          description: "Viewer-local meeting check",
          status: "SCHEDULED",
          recordingEnabled: false,
          hostId: 1,
          hostName: "Alex Rivera",
          roomName: "room-901",
          scheduledStartTime: "2026-11-15T12:00:00Z",
          startedAt: null,
          endedAt: null,
          durationSeconds: 0,
          activeParticipantsCount: 0,
          totalParticipantsCount: 1,
          isHost: true,
        },
      ],
    });

    await page.route("**/v1/projects/100", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "OK",
          data: {
            id: 100,
            name: "Web App Core",
            status: "ACTIVE",
            workflowMode: "KANBAN",
            timezoneId: "Asia/Ho_Chi_Minh",
          },
        }),
      });
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
              id: 875,
              projectId: 100,
              title: "HCM Nov 15 Task",
              priority: "HIGH",
              status: "TODO",
              dueDate: "2026-11-15T16:59:59.999999Z",
              version: 1,
              projectTimezoneId: "Asia/Ho_Chi_Minh",
            },
          ],
        }),
      });
    });

    await page.goto("/calendar?project=100");
    await expect(page.getByTestId("global-calendar-page")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("calendar-month-view-btn").click();

    await expect(page.getByTestId("calendar-cell-2026-11-15")).toContainText("HCM Nov 15 Task");
    await expect(page.getByTestId("calendar-cell-2026-11-16")).not.toContainText("HCM Nov 15 Task");
    await expect(page.getByTestId(`calendar-cell-${expectMeetingDay}`)).toContainText("12:00 UTC Global Sync");
  }

  test.describe("Multi-viewer TZ parity: America/Los_Angeles", () => {
    test.use({ timezoneId: "America/Los_Angeles" });

    test("keeps project-zone task on 2026-11-15 and meeting on viewer-local 2026-11-15", async ({ page }) => {
      await runMultiViewerCalendarScenario(page, "2026-11-15");
    });
  });

  test.describe("Multi-viewer TZ parity: Pacific/Kiritimati", () => {
    test.use({ timezoneId: "Pacific/Kiritimati" });

    test("keeps project-zone task on 2026-11-15 while meeting shifts to viewer-local 2026-11-16", async ({ page }) => {
      await runMultiViewerCalendarScenario(page, "2026-11-16");
    });
  });
});
