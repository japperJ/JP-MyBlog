import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL || "admin@aicodingblog.com";
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD || "admin123";
const editorPassword = "editor123";

function escapeForRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function login(
  page: Page,
  {
    email,
    password,
    from = "/admin",
    expectedUrl,
  }: {
    email: string;
    password: string;
    from?: string;
    expectedUrl: RegExp;
  },
) {
  await page.goto(`/admin/login?from=${encodeURIComponent(from)}`);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /login/i }).click();
  await expect(page).toHaveURL(expectedUrl);
}

async function loginAsAdmin(page: Page, from = "/admin") {
  await login(page, {
    email: adminEmail,
    password: adminPassword,
    from,
    expectedUrl: new RegExp(from === "/admin" ? "/admin$" : escapeForRegex(from)),
  });
}

async function loginAsAdminApi(request: APIRequestContext) {
  const response = await request.post("/api/auth/login", {
    data: {
      email: adminEmail,
      password: adminPassword,
    },
  });

  expect(response.ok()).toBeTruthy();
}

async function createEditorUser(request: APIRequestContext) {
  await loginAsAdminApi(request);

  const email = `editor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const response = await request.post("/api/admin/users", {
    data: {
      email,
      name: "Editor User",
      password: editorPassword,
      role: "editor",
    },
  });

  expect(response.status()).toBe(201);
  const body = await response.json();

  return {
    id: body.user.id as string,
    email,
    password: editorPassword,
  };
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

  test("opens user management for admins only", async ({ page }) => {
    await loginAsAdmin(page, "/admin/users");
    await expect(page.getByRole("heading", { name: /user management/i })).toBeVisible();
    await expect(page.getByText(/manage admin users and their access/i)).toBeVisible();
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

  test("redirects non-admins away from user management", async ({ page, request }) => {
    const editorUser = await createEditorUser(request);

    try {
      await login(page, {
        email: editorUser.email,
        password: editorUser.password,
        from: "/admin/users",
        expectedUrl: /\/admin(?:\?denied=users)?$/,
      });

      await expect(page.getByRole("heading", { name: /admin dashboard/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /^users$/i })).toHaveCount(0);
    } finally {
      await loginAsAdminApi(request);
      const cleanupResponse = await request.delete(`/api/admin/users/${editorUser.id}`);
      expect(cleanupResponse.ok()).toBeTruthy();
    }
  });
});
