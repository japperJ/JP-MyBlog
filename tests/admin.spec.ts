import { expect, test, type Page } from "@playwright/test";

const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL || "admin@aicodingblog.com";
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD || "admin123";

function escapeForRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function loginAsAdmin(page: Page, from = "/admin") {
  await page.goto(`/admin/login?from=${encodeURIComponent(from)}`);
  await page.getByLabel(/email/i).fill(adminEmail);
  await page.getByLabel(/password/i).fill(adminPassword);
  await page.getByRole("button", { name: /login/i }).click();
  await expect(page).toHaveURL(new RegExp(from === "/admin" ? "/admin$" : escapeForRegex(from)));
}

test.describe("Admin authentication", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login\?from=%2Fadmin/);
    await expect(page.getByRole("heading", { name: /admin login/i })).toBeVisible();
  });

  test("shows the dashboard after login", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByRole("heading", { name: /admin dashboard/i })).toBeVisible();
    await expect(page.getByText(/total posts/i)).toBeVisible();
  });
});

test.describe("Protected admin pages", () => {
  test("opens posts management after login", async ({ page }) => {
    await loginAsAdmin(page, "/admin/posts");
    await expect(page.getByRole("heading", { name: /manage posts/i })).toBeVisible();
  });

  test("shows the create post form", async ({ page }) => {
    await loginAsAdmin(page, "/admin/posts/new");
    await expect(page.getByRole("heading", { name: /create new post/i })).toBeVisible();
    await expect(page.getByLabel(/^title/i)).toBeVisible();
    await expect(page.getByLabel(/excerpt/i)).toBeVisible();
    await expect(page.getByLabel(/content/i)).toBeVisible();
    await expect(page.getByLabel(/cover image url/i)).toBeVisible();
  });

  test("opens category management after login", async ({ page }) => {
    await loginAsAdmin(page, "/admin/categories");
    await expect(page.getByRole("heading", { name: /manage categories/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /add new category/i })).toBeVisible();
  });

  test("opens tag management after login", async ({ page }) => {
    await loginAsAdmin(page, "/admin/tags");
    await expect(page.getByRole("heading", { name: /manage tags/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /add new tag/i })).toBeVisible();
  });

  test("shows hosted upload guidance in the media library", async ({ page }) => {
    await loginAsAdmin(page, "/admin/media");
    await expect(page.getByRole("heading", { name: /media library/i })).toBeVisible();
    await expect(page.getByText(/vercel-hosted preview and development deployments do not support persistent filesystem uploads/i)).toBeVisible();
    await expect(page.getByText(/use an external https image url/i)).toBeVisible();
  });

  test("works on a mobile viewport after login", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);
    await expect(page.getByRole("heading", { name: /admin dashboard/i })).toBeVisible();
  });
});
