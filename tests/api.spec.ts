import { expect, test, type APIRequestContext } from "@playwright/test";

const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL || "admin@aicodingblog.com";
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD || "admin123";

async function loginAsAdmin(request: APIRequestContext) {
  const response = await request.post("/api/auth/login", {
    data: {
      email: adminEmail,
      password: adminPassword,
    },
  });

  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  expect(body.mfaRequired).not.toBeTruthy();
}

test.describe("Health and auth APIs", () => {
  test("health endpoint returns ok", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();
    await expect(await response.json()).toEqual({ status: "ok" });
  });

  test("session endpoint is unauthenticated before login", async ({ request }) => {
    const response = await request.get("/api/auth/session");
    expect(response.status()).toBe(401);
    await expect(await response.json()).toEqual({ authenticated: false });
  });

  test("session endpoint reports the logged-in admin", async ({ request }) => {
    await loginAsAdmin(request);
    const response = await request.get("/api/auth/session");
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.authenticated).toBe(true);
    expect(body.user.email).toBe(adminEmail);
  });
});

test.describe("Posts API", () => {
  test("lists posts with pagination metadata", async ({ request }) => {
    const response = await request.get("/api/posts");
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(Array.isArray(body.posts)).toBe(true);
    expect(body.pagination).toBeTruthy();
  });

  test("filters published posts", async ({ request }) => {
    const response = await request.get("/api/posts?published=true");
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(Array.isArray(body.posts)).toBe(true);
    body.posts.forEach((post: { published: boolean }) => {
      expect(post.published).toBe(true);
    });
  });

  test("creates, updates, and deletes a post with auth", async ({ request }) => {
    await loginAsAdmin(request);

    const createResponse = await request.post("/api/posts", {
      data: {
        title: `Test Post ${Date.now()}`,
        content: "# Test Content\\n\\nThis post was created by Playwright.",
        excerpt: "Temporary test post",
        published: false,
        categoryIds: [],
        tagIds: [],
      },
    });

    expect(createResponse.status()).toBe(201);
    const createdPost = await createResponse.json();
    expect(createdPost.title).toContain("Test Post");

    const updateResponse = await request.patch(`/api/posts/${createdPost.id}`, {
      data: {
        title: `${createdPost.title} Updated`,
        published: true,
      },
    });

    expect(updateResponse.ok()).toBeTruthy();
    const updatedPost = await updateResponse.json();
    expect(updatedPost.title).toContain("Updated");
    expect(updatedPost.published).toBe(true);

    const deleteResponse = await request.delete(`/api/posts/${createdPost.id}`);
    expect(deleteResponse.ok()).toBeTruthy();

    const getResponse = await request.get(`/api/posts/${createdPost.id}`);
    expect(getResponse.status()).toBe(404);
  });
});

test.describe("Categories and tags APIs", () => {
  test("lists categories and tags", async ({ request }) => {
    const [categoriesResponse, tagsResponse] = await Promise.all([
      request.get("/api/categories"),
      request.get("/api/tags"),
    ]);

    expect(categoriesResponse.ok()).toBeTruthy();
    expect(tagsResponse.ok()).toBeTruthy();
    expect(Array.isArray(await categoriesResponse.json())).toBe(true);
    expect(Array.isArray(await tagsResponse.json())).toBe(true);
  });

  test("creates and updates a category with auth", async ({ request }) => {
    await loginAsAdmin(request);

    const createResponse = await request.post("/api/categories", {
      data: {
        name: `Category ${Date.now()}`,
        description: "Temporary category",
      },
    });

    expect(createResponse.status()).toBe(201);
    const category = await createResponse.json();

    const updateResponse = await request.patch(`/api/categories/${category.id}`, {
      data: {
        name: `${category.name} Updated`,
        description: "Updated category description",
      },
    });

    expect(updateResponse.ok()).toBeTruthy();
    const updatedCategory = await updateResponse.json();
    expect(updatedCategory.name).toContain("Updated");
  });

  test("creates a tag with auth", async ({ request }) => {
    await loginAsAdmin(request);

    const createResponse = await request.post("/api/tags", {
      data: {
        name: `Tag ${Date.now()}`,
      },
    });

    expect(createResponse.status()).toBe(201);
    const tag = await createResponse.json();
    expect(tag.name).toContain("Tag ");
  });
});

test.describe("OG API", () => {
  test("generates an image when title is provided", async ({ request }) => {
    const response = await request.get("/api/og?title=Test+Title&excerpt=Test+excerpt");
    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-type"]).toContain("image");
  });

  test("requires the title parameter", async ({ request }) => {
    const response = await request.get("/api/og");
    expect(response.status()).toBe(400);
  });
});
