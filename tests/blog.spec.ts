import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should display the homepage with navigation', async ({ page }) => {
    await page.goto('/');

    // Check for navigation
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Blog' })).toBeVisible();

    // Check for main heading
    await expect(page.getByRole('heading', { name: /Welcome to.*AI Coding Blog/i })).toBeVisible();

    // Check for featured posts section
    await expect(page.getByText(/Featured Posts/i)).toBeVisible();
  });

  test('should navigate to blog page', async ({ page }) => {
    await page.goto('/');
    
    await page.getByRole('link', { name: 'Blog' }).click();
    
    await expect(page).toHaveURL(/\/blog/);
    await expect(page.getByRole('heading', { name: /Blog/i })).toBeVisible();
  });

  test('should have theme toggle', async ({ page }) => {
    await page.goto('/');
    
    // Theme toggle button should be visible
    const themeToggle = page.getByRole('button', { name: /toggle theme/i });
    await expect(themeToggle).toBeVisible();
  });
});

test.describe('Blog Listing', () => {
  test('should display blog posts', async ({ page }) => {
    await page.goto('/blog');

    // Check for blog heading
    await expect(page.getByRole('heading', { name: /Blog/i })).toBeVisible();

    // Check for posts or empty state
    const posts = page.locator('[data-testid="post-card"]');
    const count = await posts.count();
    
    if (count > 0) {
      // If there are posts, verify they have required elements
      const firstPost = posts.first();
      await expect(firstPost).toBeVisible();
    } else {
      // If no posts, check for empty state or message
      await expect(page.getByText(/No posts/i)).toBeVisible();
    }
  });

  test('should filter by category', async ({ page }) => {
    await page.goto('/blog');

    // Check for category filter
    const categoryButtons = page.locator('button:has-text("Machine Learning"), button:has-text("Web Development"), button:has-text("DevOps")');
    const count = await categoryButtons.count();
    
    if (count > 0) {
      await categoryButtons.first().click();
      // URL should update with category filter
      await expect(page).toHaveURL(/category=/);
    }
  });
});

test.describe('Blog Post Page', () => {
  test('should display individual blog post', async ({ page }) => {
    // First get a post slug from the blog page
    await page.goto('/blog');
    
    const postLink = page.locator('a[href^="/blog/"]:not([href="/blog"])').first();
    const href = await postLink.getAttribute('href');
    
    if (href) {
      await page.goto(href);
      
      // Check for post content
      await expect(page.locator('article')).toBeVisible();
      
      // Check for reading time
      await expect(page.getByText(/min read/i)).toBeVisible();
      
      // Check for categories or tags
      const hasCategories = await page.getByText(/Categories|Tags/i).isVisible();
      expect(hasCategories).toBeTruthy();
    }
  });

  test('should have social sharing metadata', async ({ page }) => {
    await page.goto('/blog');
    
    const postLink = page.locator('a[href^="/blog/"]:not([href="/blog"])').first();
    const href = await postLink.getAttribute('href');
    
    if (href) {
      await page.goto(href);
      
      // Check for meta tags
      const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
      const ogDescription = await page.locator('meta[property="og:description"]').getAttribute('content');
      
      expect(ogTitle).toBeTruthy();
      expect(ogDescription).toBeTruthy();
    }
  });
});

test.describe('Search Functionality', () => {
  test('should have search on blog page', async ({ page }) => {
    await page.goto('/blog');
    
    // Check for search input
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();
  });

  test('should filter posts by search query', async ({ page }) => {
    await page.goto('/blog');
    
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('test');
    
    // Wait for search to filter
    await page.waitForTimeout(500);
    
    // Check that search was applied
    await expect(page).toHaveURL(/search=/);
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check navigation is visible
    await expect(page.locator('nav')).toBeVisible();
    
    // Check content is readable
    await expect(page.getByRole('heading', { name: /Welcome/i })).toBeVisible();
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/blog');
    
    // Check blog listing is visible
    await expect(page.getByRole('heading', { name: /Blog/i })).toBeVisible();
  });
});
