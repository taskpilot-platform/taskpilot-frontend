import { test, expect } from "./helpers/isolated-test";
import { setupWorkspaceMocks, DEFAULT_MOCK_USER } from "./helpers/mock-setup";

test.describe("P5-03 Sprint Closure & Permanent Project Purge (Mocked E2E)", () => {
  test("Complete Sprint modal shows preview, sends expectedSprintVersion + carryover, and Delete Project requires explicit confirmation", async ({
    page,
  }) => {
    await setupWorkspaceMocks(page, {
      language: "en",
      user: DEFAULT_MOCK_USER,
      isManager: true,
    });

    await page.route("**/v1/projects/100", async (route) => {
      if (route.request().method() === "DELETE") {
        const body = route.request().postDataJSON() as Record<string, unknown>;
        expect(body.confirmationText).toBe("DELETE 100");
        expect(typeof body.requestId).toBe("string");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: 200,
            message: "Project deleted successfully",
            data: {
              id: 1,
              projectId: 100,
              projectName: "Sprint Closure Project",
              deletedByUserId: DEFAULT_MOCK_USER.id,
              requestId: body.requestId,
              enqueuedCleanupJobCount: 2,
              deletedAt: "2026-11-18T02:30:00Z",
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
          message: "Success",
          data: {
            id: 100,
            name: "Sprint Closure Project",
            description: "P5-03 verification",
            status: "ACTIVE",
            workflowMode: "SCRUM",
            heuristicMode: "HEURISTIC",
            timezoneId: "UTC",
            startDate: "2026-11-01",
            endDate: "2026-12-31",
            createdAt: "2026-11-01T00:00:00Z",
          },
        }),
      });
    });

    let completed = false;
    await page.route("**/v1/projects/100/sprints", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "Success",
          data: [
            {
              id: 11,
              projectId: 100,
              name: "Sprint 11",
              goal: "Close safely",
              status: completed ? "COMPLETED" : "ACTIVE",
              startDate: "2026-11-10",
              endDate: "2026-11-24",
              version: completed ? 4 : 3,
              completedAt: completed ? "2026-11-18T02:00:00Z" : null,
              completedByUserId: completed ? DEFAULT_MOCK_USER.id : null,
              closureSnapshot: completed
                ? {
                    id: 1,
                    sprintId: 11,
                    projectId: 100,
                    sprintName: "Sprint 11",
                    sprintVersionAtClose: 3,
                    carryoverDestination: "SPRINT",
                    targetSprintId: 12,
                    totalTasksAtClose: 2,
                    doneTasksRetained: 1,
                    carriedOverTotal: 1,
                    carriedOverTodo: 0,
                    carriedOverInProgress: 0,
                    carriedOverReview: 1,
                    snapshotPayloadJson: "{}",
                    closedByUserId: DEFAULT_MOCK_USER.id,
                    closedAt: "2026-11-18T02:00:00Z",
                  }
                : null,
            },
            {
              id: 12,
              projectId: 100,
              name: "Sprint 12 Planning",
              goal: "Carryover target",
              status: "PLANNING",
              startDate: "2026-11-25",
              endDate: "2026-12-08",
              version: 0,
            },
          ],
        }),
      });
    });

    await page.route("**/v1/projects/100/backlog", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "Success",
          data: {
            unscheduledTasks: [],
            sprints: [
              {
                sprint: {
                  id: 11,
                  projectId: 100,
                  name: "Sprint 11",
                  goal: "Close safely",
                  status: completed ? "COMPLETED" : "ACTIVE",
                  startDate: "2026-11-10",
                  endDate: "2026-11-24",
                  version: completed ? 4 : 3,
                },
                tasks: [],
              },
              {
                sprint: {
                  id: 12,
                  projectId: 100,
                  name: "Sprint 12 Planning",
                  goal: "Carryover target",
                  status: "PLANNING",
                  startDate: "2026-11-25",
                  endDate: "2026-12-08",
                  version: 0,
                },
                tasks: [],
              },
            ],
          },
        }),
      });
    });

    await page.route("**/v1/projects/100/board", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "Success",
          data: { workflowMode: "SCRUM", activeSprint: null, tasks: [] },
        }),
      });
    });

    await page.route(/\/v1\/projects\/100\/sprints\/11\/complete-preview$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "Success",
          data: {
            sprintId: 11,
            sprintName: "Sprint 11",
            sprintVersion: 3,
            totalTasks: 2,
            doneTasksRetained: 1,
            unfinishedTotal: 1,
            todoCount: 0,
            inProgressCount: 0,
            reviewCount: 1,
            unfinishedTaskIds: [502],
            unfinishedTasks: [
              {
                id: 502,
                title: "Verify carryover review item",
                status: "REVIEW",
                assigneeId: DEFAULT_MOCK_USER.id,
                version: 2,
                hasPendingSubmission: true,
              },
            ],
            availableTargetSprints: [
              {
                id: 12,
                name: "Sprint 12 Planning",
                status: "PLANNING",
                version: 0,
                startDate: "2026-11-25",
                endDate: "2026-12-08",
              },
            ],
          },
        }),
      });
    });

    let completePayload: Record<string, unknown> | null = null;
    await page.route(/\/v1\/projects\/100\/sprints\/11\/complete$/, async (route) => {
      completePayload = route.request().postDataJSON() as Record<string, unknown>;
      completed = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "Sprint completed",
          data: {
            id: 11,
            projectId: 100,
            name: "Sprint 11",
            status: "COMPLETED",
            version: 4,
          },
        }),
      });
    });

    await page.route("**/v1/projects/100/members**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "Success",
          data: [
            {
              id: 1,
              userId: DEFAULT_MOCK_USER.id,
              fullName: DEFAULT_MOCK_USER.fullName,
              email: DEFAULT_MOCK_USER.email,
              role: "MANAGER",
              joinedAt: "2026-11-01T00:00:00Z",
            },
          ],
        }),
      });
    });

    await page.route("**/v1/projects/100/labels**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: 200, message: "Success", data: [] }),
      });
    });

    await page.route("**/v1/projects/100/invitations**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: 200, message: "Success", data: [] }),
      });
    });

    await page.goto("/projects/100/workspace");
    await page.getByRole("button", { name: "Backlog", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Sprint 11", exact: true })).toBeVisible();

    await page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Sprint 11", exact: true }) })
      .locator("button[aria-haspopup='menu']")
      .click();
    await page.getByRole("menuitem", { name: "Complete Sprint" }).click();

    await expect(page.getByText("#502 Verify carryover review item")).toBeVisible();
    await expect(page.getByText("Pending Review")).toBeVisible();
    await page.locator('input[name="sprint-carryover-destination"][value="SPRINT"]').check();
    await page.getByRole("button", { name: "Complete Sprint" }).click();

    await expect.poll(() => completePayload).not.toBeNull();
    expect(completePayload?.expectedSprintVersion).toBe(3);
    expect(completePayload?.carryover).toEqual({ destination: "SPRINT", targetSprintId: 12 });

    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByRole("button", { name: "Delete Project" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const confirmBtn = dialog.getByRole("button", { name: "Confirm Permanent Delete" });
    await dialog.getByLabel(/Type/i).fill("DELETE 100");
    await confirmBtn.click();
    await expect(page).toHaveURL(/\/projects$/);
  });
});
