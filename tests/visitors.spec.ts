import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL || "admin@aicodingblog.com";
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD || "admin123";

function escapeForRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function loginAsAdmin(page: Page, from = "/admin/visitors") {
  await page.goto(`/admin/login?from=${encodeURIComponent(from)}`);
  await page.getByLabel(/email/i).fill(adminEmail);
  await page.getByLabel(/password/i).fill(adminPassword);
  await page.getByRole("button", { name: /login/i }).click();
  await expect(page).toHaveURL(new RegExp(escapeForRegex(from)));
}

async function createVisitorEvent(
  request: APIRequestContext,
  {
    ipAddress,
    pathname,
    visitorId,
    city,
    region,
    country,
  }: {
    ipAddress: string;
    pathname: string;
    visitorId: string;
    city: string;
    region: string;
    country: string;
  }
) {
  const response = await request.post("/api/analytics/ingest", {
    data: {
      eventType: "page_view",
      pathname,
      fullUrl: `http://127.0.0.1:3000${pathname}`,
      visitorId,
      metadata: {
        pageTitle: "Visitors RIPE test",
      },
    },
    headers: {
      "x-forwarded-for": ipAddress,
      "x-vercel-ip-city": city,
      "x-vercel-ip-country": country,
      "x-vercel-ip-country-region": region,
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    },
  });

  expect(response.status()).toBe(202);
}

test("shows RIPE organisation data on the visitors dashboard and subpage", async ({
  page,
  request,
}) => {
  const suffix = Date.now();

  await createVisitorEvent(request, {
    ipAddress: "37.96.35.74",
    pathname: `/ripe-test-${suffix}-a`,
    visitorId: `ripe-visitor-${suffix}-a`,
    city: "Copenhagen",
    region: "Capital Region",
    country: "Denmark",
  });
  await createVisitorEvent(request, {
    ipAddress: "37.96.35.74",
    pathname: `/ripe-test-${suffix}-b`,
    visitorId: `ripe-visitor-${suffix}-b`,
    city: "Copenhagen",
    region: "Capital Region",
    country: "Denmark",
  });
  await createVisitorEvent(request, {
    ipAddress: "135.232.20.17",
    pathname: `/ripe-test-${suffix}-c`,
    visitorId: `ripe-visitor-${suffix}-c`,
    city: "London",
    region: "England",
    country: "United Kingdom",
  });

  await loginAsAdmin(page, "/admin/visitors");
  await expect(page.getByRole("heading", { name: /visitor intelligence/i })).toBeVisible();
  await expect(page.getByText(/responsible organisations \(ripe\)/i)).toBeVisible();

  await page.getByRole("link", { name: /^ip organisations$/i }).click();

  await expect(page).toHaveURL(/\/admin\/visitors\/ip-organisations$/);
  await expect(page.getByRole("heading", { name: /ip organisations/i })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Microsoft Limited" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Telenor A/S" })).toBeVisible();

  const microsoftRow = page.locator("tbody tr").filter({ hasText: "135.232.20.17" });
  await expect(microsoftRow).toContainText("Microsoft Limited");
  await expect(microsoftRow.getByRole("link", { name: /open ripe db/i })).toHaveAttribute(
    "href",
    /searchtext=135\.232\.20\.17/
  );

  const telenorRow = page.locator("tbody tr").filter({ hasText: "37.96.35.74" });
  await expect(telenorRow).toContainText("Telenor A/S");
  await expect(telenorRow).toContainText("2");

  const rowTexts = await page.locator("tbody tr").allTextContents();
  const microsoftIndex = rowTexts.findIndex((row) => row.includes("Microsoft Limited"));
  const telenorIndex = rowTexts.findIndex((row) => row.includes("Telenor A/S"));

  expect(microsoftIndex).toBeGreaterThanOrEqual(0);
  expect(telenorIndex).toBeGreaterThanOrEqual(0);
  expect(microsoftIndex).toBeLessThan(telenorIndex);
});
