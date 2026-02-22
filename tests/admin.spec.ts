import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  test('should display admin dashboard', async ({ page }) => {
    await page.goto('/admin');

    // Check for dashboard heading
    await expect(page.getByRole('heading', { name: /Admin Dashboard/i })).toBeVisible();

    // Check for stats cards
    await expect(page.getByText(/Total Posts/i)).toBeVisible();
    await expect(page.getByText(/Categories/i)).toBeVisible();
    await expect(page.getByText(/Tags/i)).toBeVisible();
    await expect(page.getByText(/Total Views/i)).toBeVisible();

    // Check for quick actions
    await expect(page.getByRole('link', { name: /View Posts/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /New Post/i })).toBeVisible();
  });

  test('should navigate to create post page', async ({ page }) => {
    await page.goto('/admin');
    
    await page.getByRole('link', { name: /Create New Post/i }).first().click();
    
    await expect(page).toHaveURL(/\/admin\/posts\/new/);
    await expect(page.getByRole('heading', { name: /Create New Post/i })).toBeVisible();
  });

  test('should navigate to posts management', async ({ page }) => {
    await page.goto('/admin');
    
    await page.getByRole('link', { name: /View Posts/i }).click();
    
    await expect(page).toHaveURL(/\/admin\/posts/);
    await expect(page.getByRole('heading', { name: /Manage Posts/i })).toBeVisible();
  });

  test('should navigate to categories management', async ({ page }) => {
    await page.goto('/admin');
    
    await page.getByRole('link', { name: /Manage Categories/i }).click();
    
    await expect(page).toHaveURL(/\/admin\/categories/);
    await expect(page.getByRole('heading', { name: /Categories/i })).toBeVisible();
  });

  test('should navigate to tags management', async ({ page }) => {
    await page.goto('/admin');
    
    await page.getByRole('link', { name: /Manage Tags/i }).click();
    
    await expect(page).toHaveURL(/\/admin\/tags/);
    await expect(page.getByRole('heading', { name: /Tags/i })).toBeVisible();
  });

  test('should navigate to media library', async ({ page }) => {
    await page.goto('/admin');
    
    await page.getByRole('link', { name: /Manage Media/i }).click();
    
    await expect(page).toHaveURL(/\/admin\/media/);
    await expect(page.getByRole('heading', { name: /Media Library/i })).toBeVisible();
  });
});

test.describe('Posts Management', () => {
  test('should display posts list', async ({ page }) => {
    await page.goto('/admin/posts');

    await expect(page.getByRole('heading', { name: /Manage Posts/i })).toBeVisible();
    
    // Should have create button
    await expect(page.getByRole('link', { name: /Create New Post/i })).toBeVisible();
  });

  test('should have create post form', async ({ page }) => {
    await page.goto('/admin/posts/new');

    // Check for form fields
    await expect(page.getByLabel(/Title/i)).toBeVisible();
    await expect(page.getByLabel(/Slug/i)).toBeVisible();
    await expect(page.getByLabel(/Excerpt/i)).toBeVisible();
    await expect(page.getByLabel(/Content/i)).toBeVisible();

    // Check for submit button
    await expect(page.getByRole('button', { name: /Create Post/i })).toBeVisible();
  });

  test('should auto-generate slug from title', async ({ page }) => {
    await page.goto('/admin/posts/new');

    const titleInput = page.getByLabel(/^Title$/i);
    const slugInput = page.getByLabel(/Slug/i);

    await titleInput.fill('Test Post Title');
    await titleInput.blur();

    // Wait for slug to be generated
    await page.waitForTimeout(300);

    const slugValue = await slugInput.inputValue();
    expect(slugValue).toBe('test-post-title');
  });
});

test.describe('Categories Management', () => {
  test('should display categories list', async ({ page }) => {
    await page.goto('/admin/categories');

    await expect(page.getByRole('heading', { name: /Categories/i })).toBeVisible();
  });

  test('should have add category form', async ({ page }) => {
    await page.goto('/admin/categories');

    await expect(page.getByPlaceholder(/Category name/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Add Category/i })).toBeVisible();
  });

  test('should create a new category', async ({ page }) => {
    await page.goto('/admin/categories');

    const categoryName = 'Test Category ' + Date.now();
    
    await page.getByPlaceholder(/Category name/i).fill(categoryName);
    await page.getByRole('button', { name: /Add Category/i }).click();

    // Wait for the category to appear
    await page.waitForTimeout(1000);

    // Check if category was added
    await expect(page.getByText(categoryName)).toBeVisible();
  });
});

test.describe('Tags Management', () => {
  test('should display tags list', async ({ page }) => {
    await page.goto('/admin/tags');

    await expect(page.getByRole('heading', { name: /Tags/i })).toBeVisible();
  });

  test('should have add tag form', async ({ page }) => {
    await page.goto('/admin/tags');

    await expect(page.getByPlaceholder(/Tag name/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Add Tag/i })).toBeVisible();
  });

  test('should create a new tag', async ({ page }) => {
    await page.goto('/admin/tags');

    const tagName = 'Test Tag ' + Date.now();
    
    await page.getByPlaceholder(/Tag name/i).fill(tagName);
    await page.getByRole('button', { name: /Add Tag/i }).click();

    // Wait for the tag to appear
    await page.waitForTimeout(1000);

    // Check if tag was added
    await expect(page.getByText(tagName)).toBeVisible();
  });
});

test.describe('Media Library', () => {
  test('should display media library', async ({ page }) => {
    await page.goto('/admin/media');

    await expect(page.getByRole('heading', { name: /Media Library/i })).toBeVisible();
    
    // Check for upload area
    await expect(page.getByText(/Click to upload or drag and drop/i)).toBeVisible();
  });

  test('should have upload functionality', async ({ page }) => {
    await page.goto('/admin/media');

    // Check for file input
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
  });

  test('should display usage instructions', async ({ page }) => {
    await page.goto('/admin/media');

    await expect(page.getByText(/How to Use/i)).toBeVisible();
    await expect(page.getByText(/Upload Image/i)).toBeVisible();
    await expect(page.getByText(/Copy URL/i)).toBeVisible();
  });
});

test.describe('Responsive Admin', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/admin');
    
    // Check dashboard is accessible
    await expect(page.getByRole('heading', { name: /Admin Dashboard/i })).toBeVisible();
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/admin/posts');
    
    // Check posts management is accessible
    await expect(page.getByRole('heading', { name: /Manage Posts/i })).toBeVisible();
  });
});
