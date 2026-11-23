import { expect, test } from "@playwright/test";

const BACKEND_URL = process.env.E2E_LIVE_BACKEND_URL;
const MANAGER_EMAIL = process.env.E2E_LIVE_MANAGER_EMAIL;
const ASSIGNEE_EMAIL = process.env.E2E_LIVE_ASSIGNEE_EMAIL;
const TEST_PASSWORD = process.env.E2E_LIVE_PASSWORD;
const PROJECT_ID = Number(process.env.E2E_LIVE_PROJECT_ID);

test.describe("P5-02 Live Full-Stack Task Workflow (UI -> HTTP -> PostgreSQL)", () => {
  test("real assignee submit, independent manager quality-v1 review, page reload persistence, and reopen invalidation", async ({
    browser,
    request,
  }) => {
    if (!BACKEND_URL || !MANAGER_EMAIL || !ASSIGNEE_EMAIL || !TEST_PASSWORD || !Number.isFinite(PROJECT_ID)) {
      throw new Error("Missing required E2E_LIVE_* bootstrap env variables");
    }

    // Obtain assignee user ID via real /auth/login -> /users/me (no mocks).
    const assigneeLogin = await request.post(`${BACKEND_URL}/api/v1/auth/login`, {
      data: { email: ASSIGNEE_EMAIL, password: TEST_PASSWORD },
    });
    expect(assigneeLogin.status()).toBe(200);
    const assigneeLoginJson = (await assigneeLogin.json()) as {
      data: { token: string; user?: { id: number } };
    };
    const assigneeJwt = assigneeLoginJson.data.token;

    const assigneeMe = await request.get(`${BACKEND_URL}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${assigneeJwt}` },
    });
    expect(assigneeMe.status()).toBe(200);
    const assigneeUserId = ((await assigneeMe.json()) as { data: { id: number } }).data.id;

    // Manager logs in and creates + starts a task assigned to assignee via real REST -> Postgres.
    const managerLogin = await request.post(`${BACKEND_URL}/api/v1/auth/login`, {
      data: { email: MANAGER_EMAIL, password: TEST_PASSWORD },
    });
    expect(managerLogin.status()).toBe(200);
    const managerJwt = ((await managerLogin.json()) as { data: { token: string } }).data.token;

    const createReqId = crypto.randomUUID();
    const taskTitle = `Live Workflow Task ${Date.now()}`;
    const createResp = await request.post(`${BACKEND_URL}/api/v1/tasks`, {
      headers: {
        Authorization: `Bearer ${managerJwt}`,
        "Idempotency-Key": createReqId,
      },
      data: {
        projectId: PROJECT_ID,
        title: taskTitle,
        description: "Verify live PostgreSQL V48 workflow persistence",
        assigneeId: assigneeUserId,
        dueDate: "2027-12-31",
        requestId: createReqId,
      },
    });
    expect(createResp.status()).toBe(201);
    const createdTask = ((await createResp.json()) as { data: { id: number; version: number } }).data;

    const startReqId = crypto.randomUUID();
    const startResp = await request.patch(`${BACKEND_URL}/api/v1/tasks/${createdTask.id}`, {
      headers: {
        Authorization: `Bearer ${managerJwt}`,
        "Idempotency-Key": startReqId,
      },
      data: {
        expectedTaskVersion: createdTask.version,
        status: "IN_PROGRESS",
        requestId: startReqId,
      },
    });
    expect(startResp.status()).toBe(200);

    // 1. Assignee signs in through the real UI, drags IN_PROGRESS -> REVIEW, and submits via UI modal.
    const assigneeCtx = await browser.newContext();
    const assigneePage = await assigneeCtx.newPage();
    await assigneePage.addInitScript(() => {
      localStorage.setItem("i18nextLng", "en");
    });

    await assigneePage.goto("/login");
    await assigneePage.locator("#email").fill(ASSIGNEE_EMAIL);
    await assigneePage.locator("#password").fill(TEST_PASSWORD);
    await assigneePage.locator('button[type="submit"]').click();
    await expect(assigneePage).toHaveURL(/\/dashboard/);

    await assigneePage.goto(`/projects/${PROJECT_ID}/board`);
    const taskCard = assigneePage.locator(".project-task-card", { hasText: taskTitle });
    await expect(taskCard).toBeVisible();

    const reviewColumn = assigneePage
      .locator("div.flex-1.flex.flex-col.rounded-xl")
      .filter({ has: assigneePage.locator("h3", { hasText: /review/i }) })
      .first();
    const reviewDropTarget = reviewColumn.getByText("Drop tasks here");
    await reviewDropTarget.scrollIntoViewIfNeeded();
    await taskCard.dragTo(reviewDropTarget);

    await expect(assigneePage.getByRole("heading", { name: "Submit Task for Review" })).toBeVisible();
    await assigneePage
      .getByLabel(/Submission Summary/i)
      .fill("Live PostgreSQL submission with verified acceptance checks.");
    const submitRespPromise = assigneePage.waitForResponse(
      (res) => res.url().includes(`/v1/tasks/${createdTask.id}/workflow/submit`) && res.request().method() === "POST",
    );
    await assigneePage.getByRole("button", { name: "Submit for Review" }).click();
    const submitResp = await submitRespPromise;
    expect(submitResp.status()).toBe(200);
    await expect(assigneePage.getByRole("heading", { name: "Submit Task for Review" })).toBeHidden();

    // Reload task detail as assignee to verify PENDING submission persisted in PostgreSQL.
    await assigneePage.goto(`/projects/${PROJECT_ID}/tasks/${createdTask.id}`);
    await expect(assigneePage.getByText("Cycle #1")).toBeVisible();
    await expect(assigneePage.getByText("PENDING", { exact: true }).first()).toBeVisible();
    await assigneeCtx.close();

    // 2. Manager signs in through the real UI, records independent review (4/5), reloads to confirm persistence, then reopens.
    const managerCtx = await browser.newContext();
    const managerPage = await managerCtx.newPage();
    await managerPage.addInitScript(() => {
      localStorage.setItem("i18nextLng", "en");
    });

    await managerPage.goto("/login");
    await managerPage.locator("#email").fill(MANAGER_EMAIL);
    await managerPage.locator("#password").fill(TEST_PASSWORD);
    await managerPage.locator('button[type="submit"]').click();
    await expect(managerPage).toHaveURL(/\/dashboard/);

    await managerPage.goto(`/projects/${PROJECT_ID}/tasks/${createdTask.id}`);
    await expect(managerPage.getByText("Cycle #1")).toBeVisible();
    await managerPage.getByRole("button", { name: "Review Submission" }).click();

    await managerPage.getByRole("button", { name: "4", exact: true }).click();
    await expect(managerPage.getByText("4 - First substantive pass")).toBeVisible();
    await managerPage
      .getByLabel(/Anchor & Evidence Verification Summary/i)
      .fill("Checked live HTTP workflow and DB constraints.");
    await managerPage
      .getByLabel(/Acceptance Rationale/i)
      .fill("Meets all agreed criteria on first pass.");
    const reviewRespPromise = managerPage.waitForResponse(
      (res) => res.url().includes(`/v1/tasks/${createdTask.id}/workflow/review`) && res.request().method() === "POST",
    );
    await managerPage.getByRole("button", { name: "Accept & Save Evaluation" }).click();
    const reviewResp = await reviewRespPromise;
    expect(reviewResp.status()).toBe(200);

    await expect(managerPage.getByText(/Evaluated 4\/5/i)).toBeVisible();
    await expect(managerPage.getByText(/On Time/i).first()).toBeVisible();

    // Hard reload to prove evaluation, timeliness, and review history come from PostgreSQL.
    await managerPage.reload();
    await expect(managerPage.getByText(/Evaluated 4\/5/i)).toBeVisible();
    await expect(managerPage.getByText("INDEPENDENT_ACCEPTED").first()).toBeVisible();

    // Reopen task from UI and reload to verify persisted invalidation without deleting history.
    await managerPage.getByRole("button", { name: "Reopen Task" }).click();
    await managerPage.getByLabel(/Reopen Reason/i).fill("Reopened in live E2E verification");
    const reopenRespPromise = managerPage.waitForResponse(
      (res) => res.url().includes(`/v1/tasks/${createdTask.id}/workflow/reopen`) && res.request().method() === "POST",
    );
    await managerPage.getByRole("button", { name: "Confirm Reopen" }).click();
    const reopenResp = await reopenRespPromise;
    expect(reopenResp.status()).toBe(200);

    await expect(managerPage.getByText("Invalidated: REOPENED")).toBeVisible();
    await managerPage.reload();
    await expect(managerPage.getByText("Invalidated: REOPENED")).toBeVisible();
    await managerCtx.close();
  });
});
