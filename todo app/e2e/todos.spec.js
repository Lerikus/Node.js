import { test, expect } from "@playwright/test";

test("index page has title", async ({ page }) => {
  await page.goto("/");
  //check title
  await expect(page.getByText("MY TODO APP")).toBeDefined();
});

test("form on index page creates new todos", async ({ page }) => {
  await page.goto("/");
  //fill and submit new todo
  await page.getByLabel("Todo title").fill("E2E todo");
  await page.getByText("Add todo").click();
  //check visibilty of todo
  await expect(page.getByText("E2E todo")).toBeDefined();
});

test("can edit a todo's title and priority", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Todo title").fill("Edit me");
  await page.getByText("Add todo").click();

  //go to detail page
  await page.getByRole("link", { name: /Edit me/ }).click();

  //edit title n priority
  await page.locator('form[action*="update"] input[name="title"]').fill("Edited todo");
  await page.getByLabel("Priority:").selectOption("high");

  //submit update
  await page.getByRole("button", { name: /update/i }).click();

  //check update
  await expect(page.getByText("Edited todo")).toBeVisible();
});

test("can mark a todo as completed and uncompleted", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Todo title").fill("Complete me");
  await page.getByText("Add todo").click();

  //find the button
  const todoItem = page.locator('li', { hasText: "Complete me" });

  //done
  await todoItem.getByRole("link", { name: "[done]" }).click();

  //undone
  await todoItem.getByRole("link", { name: "[undone]" }).click();
});

test("can delete a todo", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Todo title").fill("Delete me");
  await page.getByText("Add todo").click();

  //find delete
  const todoItem = page.locator('li', { hasText: "Delete me" });

  //delete
  await todoItem.getByRole("link", { name: "[delete]" }).click();

  //verify delete
  await expect(page.getByText("Delete me")).not.toBeVisible();
});

test("can create todos with different priorities", async ({ page }) => {
  await page.goto("/");

  //add low prio
  await page.getByLabel("Todo title").fill("Low priority");
  await page.getByLabel("Priority").selectOption("low");
  await page.getByText("Add todo").click();

  //add normal prio
  await page.getByLabel("Todo title").fill("Normal priority");
  await page.getByLabel("Priority").selectOption("normal");
  await page.getByText("Add todo").click();

  //add high prio
  await page.getByLabel("Todo title").fill("High priority");
  await page.getByLabel("Priority").selectOption("high");
  await page.getByText("Add todo").click();

  //check visiblity
  await expect(page.getByText("Low priority")).toBeVisible();
  await expect(page.getByText("Normal priority")).toBeVisible();
  await expect(page.getByText("High priority")).toBeVisible();
});

test("can view todo detail page", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Todo title").fill("Detail todo");
  await page.getByText("Add todo").click();

  //go to detail page
  await page.getByText("Detail todo").click();

  //check url and content
  await expect(page).toHaveURL(/\/todo\/\d+/);
  await expect(page.getByText("Detail todo")).toBeVisible();
});

test("can update only the priority of a todo", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Todo title").fill("Priority update");
  await page.getByText("Add todo").click();

  //go to detail page
  await page.getByRole("link", { name: /Priority update/ }).click();

  //change prio
  await page.getByLabel("Priority:").selectOption("low");
  await page.getByRole("button", { name: /update/i }).click();

  //check prio is updated
  await expect(page.locator(".priority-low")).toBeVisible();
});

test("cannot update todo to empty title", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Todo title").fill("No empty title");
  await page.getByText("Add todo").click();

  //go to detail page
  await page.getByRole("link", { name: /No empty title/ }).click();

  //try submit empty title
  const titleInput = page.locator('form[action*="update"] input[name="title"]');
  await titleInput.fill("");
  await page.getByRole("button", { name: /update/i }).click();

  //should be on detail page and see the original title
  await expect(page.getByText("No empty title")).toBeVisible();
});
