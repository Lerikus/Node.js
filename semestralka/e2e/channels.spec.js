import { test, expect } from "@playwright/test";

// Helper: Log in as test user before each test
async function login(page) {
  await page.goto("http://localhost:3000/login");
  await page.getByLabel(/username/i).fill("admin");
  await page.getByLabel(/password/i).fill("admin123");
  await page.getByRole("button", { name: /log ?in/i }).click();
  // Wait for redirect to channels or home
  await expect(page).toHaveURL(/channels|\//);
}

test("index page has title", async ({ page }) => {
  await login(page);
  await page.goto("/");
  await expect(page.getByText(/slack clone|clask/i)).toBeVisible();
});

test("can create a new channel", async ({ page }) => {
  await login(page);
  await page.goto("http://localhost:3000/channels/new");
  const uniqueName = `E2E Channel ${Date.now()}`;
  await page.getByLabel(/channel name/i).fill(uniqueName);
  await page.getByLabel(/description/i).fill("E2E channel description");
  await Promise.all([
    page.waitForURL(/\/channels\/\d+$/),
    page.getByRole("button", { name: /create channel/i }).click()
  ]);
  // Check for the message input and description on the new channel page
  await expect(page.getByPlaceholder(/type a message/i)).toBeVisible();
  await expect(page.getByText("E2E channel description")).toBeVisible();
});

test("can send a message in a channel", async ({ page }) => {
  await login(page);
  await page.goto("http://localhost:3000/channels/1");
  await page.getByPlaceholder(/type a message/i).fill("Hello from E2E");
  await Promise.all([
    page.waitForResponse(resp => resp.url().includes("/api/messages") && resp.status() === 200),
    page.getByRole("button", { name: /send/i }).click()
  ]);
  // Wait for the last message content
  await expect(page.locator(".message-content", { hasText: "Hello from E2E" }).last()).toBeVisible();
});


test("can see date dividers and own messages styled", async ({ page }) => {
  await login(page);
  await page.goto("http://localhost:3000/channels/1");
  await page.getByPlaceholder(/type a message/i).fill("Date divider test");
  await Promise.all([
    page.waitForResponse(resp => resp.url().includes("/api/messages") && resp.status() === 200),
    page.getByRole("button", { name: /send/i }).click()
  ]);
  await expect(page.locator(".date-divider").first()).toBeVisible();
  // Check at least one own message is visible
  await expect(page.locator(".message-own").first()).toBeVisible();
});
