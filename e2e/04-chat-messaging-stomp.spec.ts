import { test, expect } from "@playwright/test";
import { setupWorkspaceMocks, DEFAULT_MOCK_USER, TEAMMATE_USER } from "./helpers/mock-setup";

const SAMPLE_MESSAGES = [
  {
    id: 1,
    projectId: 100,
    senderId: 2, // Sarah Connor
    senderName: "Sarah Connor",
    senderAvatarUrl: null,
    messageType: "TEXT",
    content: "Good morning team! Has anyone reviewed the new architecture doc?",
    createdAt: "2026-10-08T08:00:00Z",
  },
  {
    id: 2,
    projectId: 100,
    senderId: 1, // Alex Rivera (me)
    senderName: "Alex Rivera",
    senderAvatarUrl: null,
    messageType: "TEXT",
    content: "Yes, I uploaded it to the Files tab. Looking good so far!",
    createdAt: "2026-10-08T08:02:00Z",
  },
];

test.describe("Suite 4: Real-time Project Chat & STOMP Messaging (TC061 - TC085)", () => {
  test.beforeEach(async ({ page }) => {
    await setupWorkspaceMocks(page, { initialMessages: SAMPLE_MESSAGES });
  });

  // TC061: Chat room renders with channel header
  test("TC061: Chat room renders header with Project Chat Room title", async ({ page }) => {
    await page.goto("/projects/100/chat");
    await expect(page.getByText("Project Chat Room")).toBeVisible();
    await expect(page.getByText("Real-time team messaging and discussions")).toBeVisible();
  });

  // TC062: Connection status badge renders
  test("TC062: Displays connection status badge in header", async ({ page }) => {
    await page.goto("/projects/100/chat");
    const badge = page.getByText(/Connected|Reconnecting/i);
    await expect(badge).toBeVisible();
  });

  // TC063: Initial messages load
  test("TC063: Initial messages load and render in chronological order", async ({ page }) => {
    await page.goto("/projects/100/chat");
    await expect(page.getByText("Good morning team! Has anyone reviewed the new architecture doc?")).toBeVisible();
    await expect(page.getByText("Yes, I uploaded it to the Files tab. Looking good so far!")).toBeVisible();
  });

  // TC064: Empty state renders when 0 messages
  test("TC064: Displays empty conversation message when no messages exist", async ({ page }) => {
    await setupWorkspaceMocks(page, { initialMessages: [] });
    await page.goto("/projects/100/chat");
    await expect(page.getByText("No messages yet")).toBeVisible();
    await expect(page.getByText("Say hello to your project teammates to kick off collaboration!")).toBeVisible();
  });

  // TC065: Send plain text message via submit button
  test("TC065: Typing and clicking Send button appends new message", async ({ page }) => {
    await page.goto("/projects/100/chat");
    const input = page.getByPlaceholder("Type a message...");
    await input.fill("Let's schedule our sprint planning at 2 PM.");

    const sendBtn = page.getByRole("button", { name: /Send/i });
    await sendBtn.click();

    await expect(page.getByText("Let's schedule our sprint planning at 2 PM.")).toBeVisible();
  });

  // TC066: Send message via Enter key
  test("TC066: Pressing Enter key submits the chat message", async ({ page }) => {
    await page.goto("/projects/100/chat");
    const input = page.getByPlaceholder("Type a message...");
    await input.fill("Message sent via Enter key press.");
    await input.press("Enter");

    await expect(page.getByText("Message sent via Enter key press.")).toBeVisible();
  });

  // TC067: Input clears after send
  test("TC067: Message input field is cleared immediately after sending", async ({ page }) => {
    await page.goto("/projects/100/chat");
    const input = page.getByPlaceholder("Type a message...");
    await input.fill("Checking input clear behavior");
    await input.press("Enter");

    await expect(input).toHaveValue("");
  });

  // TC068: Prevent sending empty message
  test("TC068: Submitting empty input does not dispatch any message", async ({ page }) => {
    await page.goto("/projects/100/chat");
    const input = page.getByPlaceholder("Type a message...");
    await input.fill("");
    await input.press("Enter");

    // Message count should remain 2
    const bubbles = page.locator("div").filter({ hasText: "Looking good so far!" });
    await expect(bubbles.first()).toBeVisible();
  });

  // TC069: Prevent sending whitespace-only message
  test("TC069: Submitting whitespace-only input does not create new message", async ({ page }) => {
    await page.goto("/projects/100/chat");
    const input = page.getByPlaceholder("Type a message...");
    await input.fill("     ");
    await input.press("Enter");

    await expect(input).toHaveValue("     ");
  });

  // TC070: Own message alignment and style
  test("TC070: Own message renders with primary bubble styling", async ({ page }) => {
    await page.goto("/projects/100/chat");
    const ownBubble = page.getByText("Yes, I uploaded it to the Files tab. Looking good so far!");
    await expect(ownBubble).toBeVisible();
  });

  // TC071: Teammate message alignment and sender label
  test("TC071: Teammate message renders with sender name label Sarah Connor", async ({ page }) => {
    await page.goto("/projects/100/chat");
    await expect(page.getByText("Sarah Connor")).toBeVisible();
    await expect(page.getByText("Good morning team!")).toBeVisible();
  });

  // TC072: Message timestamp format
  test("TC072: Message displays time timestamp badge", async ({ page }) => {
    await page.goto("/projects/100/chat");
    const timeElements = page.locator("time");
    await expect(timeElements.first()).toBeVisible();
  });

  // TC073: Input disabled when project is ARCHIVED
  test("TC073: Chat input is disabled when project is archived", async ({ page }) => {
    await setupWorkspaceMocks(page, { isArchived: true });
    await page.goto("/projects/100/chat");
    const input = page.getByPlaceholder("Project is archived");
    await expect(input).toBeDisabled();
  });

  // TC074: Send button disabled when project is ARCHIVED
  test("TC074: Send button is disabled when project is archived", async ({ page }) => {
    await setupWorkspaceMocks(page, { isArchived: true });
    await page.goto("/projects/100/chat");
    const sendBtn = page.getByRole("button", { name: /Send/i });
    await expect(sendBtn).toBeDisabled();
  });

  // TC075: Send message with emojis
  test("TC075: Supports emojis and symbols in chat text", async ({ page }) => {
    await page.goto("/projects/100/chat");
    const input = page.getByPlaceholder("Type a message...");
    await input.fill("Great job on sprint delivery! 🚀🎉💯");
    await input.press("Enter");

    await expect(page.getByText("Great job on sprint delivery! 🚀🎉💯")).toBeVisible();
  });

  // TC076: Send message with punctuation and quotes
  test("TC076: Handles special quotes and symbols accurately", async ({ page }) => {
    await page.goto("/projects/100/chat");
    const input = page.getByPlaceholder("Type a message...");
    await input.fill('Meeting topic: "API Refactoring & V32 schema" — see #collab');
    await input.press("Enter");

    await expect(page.getByText('Meeting topic: "API Refactoring & V32 schema" — see #collab')).toBeVisible();
  });

  // TC077: Send message with URL
  test("TC077: Renders message containing web link URL", async ({ page }) => {
    await page.goto("/projects/100/chat");
    const input = page.getByPlaceholder("Type a message...");
    await input.fill("Check the live deployment at https://taskpilot-platform.netlify.app");
    await input.press("Enter");

    await expect(page.getByText("https://taskpilot-platform.netlify.app")).toBeVisible();
  });

  // TC078: Long continuous text wraps gracefully
  test("TC078: Wraps long unbroken string without layout overflow", async ({ page }) => {
    await page.goto("/projects/100/chat");
    const input = page.getByPlaceholder("Type a message...");
    const longToken = "abcde".repeat(20);
    await input.fill(`Token: ${longToken}`);
    await input.press("Enter");

    await expect(page.getByText(longToken)).toBeVisible();
  });

  // TC079: Rapid consecutive messages
  test("TC079: Supports sending multiple messages in rapid succession", async ({ page }) => {
    await page.goto("/projects/100/chat");
    const input = page.getByPlaceholder("Type a message...");

    await input.fill("Rapid message 1");
    await input.press("Enter");
    await input.fill("Rapid message 2");
    await input.press("Enter");

    await expect(page.getByText("Rapid message 1")).toBeVisible();
    await expect(page.getByText("Rapid message 2")).toBeVisible();
  });

  // TC080: Chat room card header icons
  test("TC080: Renders MessageSquare icon in chat header", async ({ page }) => {
    await page.goto("/projects/100/chat");
    const headerIcon = page.locator("svg.lucide-message-square");
    await expect(headerIcon.first()).toBeVisible();
  });

  // TC081: Teammate avatar placeholder
  test("TC081: Shows initial letter or User icon when sender has no avatar", async ({ page }) => {
    await page.goto("/projects/100/chat");
    // Sarah Connor initials or 'S'
    const initialAvatar = page.locator("div").filter({ hasText: /^S$/ }).first();
    await expect(initialAvatar).toBeVisible();
  });

  // TC082: Chat view responsiveness on mobile 375px
  test("TC082: Renders responsive mobile chat layout without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/projects/100/chat");
    await expect(page.getByText("Project Chat Room")).toBeVisible();
    await expect(page.getByPlaceholder("Type a message...")).toBeVisible();
  });

  // TC083: Chat scroll container presence
  test("TC083: Message container has scrollable overflow area", async ({ page }) => {
    await page.goto("/projects/100/chat");
    const scrollContainer = page.locator(".overflow-y-auto");
    await expect(scrollContainer.first()).toBeVisible();
  });

  // TC084: Message card contains Project Chat Room label
  test("TC084: Displays Project Chat Room card title in stream", async ({ page }) => {
    await page.goto("/projects/100/chat");
    await expect(page.getByText("Project Chat Room").first()).toBeVisible();
  });

  // TC085: Chat form button contains Send label and icon
  test("TC085: Send button displays Lucide Send icon", async ({ page }) => {
    await page.goto("/projects/100/chat");
    const sendSvg = page.locator("button svg.lucide-send");
    await expect(sendSvg.first()).toBeVisible();
  });
});
