import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3001';

test.describe('Health Check API', () => {
  test('should return healthy status', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/health`);
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.status).toBe('healthy');
    expect(data.database).toBe('connected');
  });
});

test.describe('Posts API', () => {
  test('should get all posts', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/posts`);
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('should filter posts by published status', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/posts?published=true`);
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
    
    // All returned posts should be published
    data.forEach((post: any) => {
      expect(post.published).toBe(true);
    });
  });

  test('should create a new post', async ({ request }) => {
    const newPost = {
      title: 'Test Post from API',
      slug: 'test-post-api-' + Date.now(),
      content: '# Test Content\n\nThis is a test post created via API.',
      excerpt: 'Test excerpt',
      published: false,
      categoryIds: [],
      tagIds: [],
    };

    const response = await request.post(`${API_BASE}/api/posts`, {
      data: newPost,
    });

    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.title).toBe(newPost.title);
    expect(data.slug).toBe(newPost.slug);
    expect(data.published).toBe(false);
  });

  test('should update a post', async ({ request }) => {
    // First create a post
    const newPost = {
      title: 'Post to Update',
      slug: 'post-to-update-' + Date.now(),
      content: '# Original Content',
      excerpt: 'Original excerpt',
      published: false,
      categoryIds: [],
      tagIds: [],
    };

    const createResponse = await request.post(`${API_BASE}/api/posts`, {
      data: newPost,
    });
    const createdPost = await createResponse.json();

    // Update the post
    const updateResponse = await request.patch(`${API_BASE}/api/posts/${createdPost.id}`, {
      data: {
        title: 'Updated Title',
        published: true,
      },
    });

    expect(updateResponse.ok()).toBeTruthy();
    
    const updatedPost = await updateResponse.json();
    expect(updatedPost.title).toBe('Updated Title');
    expect(updatedPost.published).toBe(true);
  });

  test('should delete a post', async ({ request }) => {
    // First create a post to delete
    const newPost = {
      title: 'Post to Delete',
      slug: 'post-to-delete-' + Date.now(),
      content: '# Content',
      excerpt: 'Excerpt',
      published: false,
      categoryIds: [],
      tagIds: [],
    };

    const createResponse = await request.post(`${API_BASE}/api/posts`, {
      data: newPost,
    });
    const createdPost = await createResponse.json();

    // Delete the post
    const deleteResponse = await request.delete(`${API_BASE}/api/posts/${createdPost.id}`);
    expect(deleteResponse.ok()).toBeTruthy();

    // Verify it's deleted
    const getResponse = await request.get(`${API_BASE}/api/posts/${createdPost.id}`);
    expect(getResponse.status()).toBe(404);
  });
});

test.describe('Categories API', () => {
  test('should get all categories', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/categories`);
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('should create a category', async ({ request }) => {
    const newCategory = {
      name: 'Test Category ' + Date.now(),
      slug: 'test-category-' + Date.now(),
      description: 'Test category description',
    };

    const response = await request.post(`${API_BASE}/api/categories`, {
      data: newCategory,
    });

    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.name).toBe(newCategory.name);
    expect(data.slug).toBe(newCategory.slug);
  });

  test('should update a category', async ({ request }) => {
    // Create a category first
    const newCategory = {
      name: 'Category to Update ' + Date.now(),
      slug: 'category-update-' + Date.now(),
      description: 'Original description',
    };

    const createResponse = await request.post(`${API_BASE}/api/categories`, {
      data: newCategory,
    });
    const createdCategory = await createResponse.json();

    // Update it
    const updateResponse = await request.patch(`${API_BASE}/api/categories/${createdCategory.id}`, {
      data: {
        name: 'Updated Category Name',
        description: 'Updated description',
      },
    });

    expect(updateResponse.ok()).toBeTruthy();
    
    const updatedCategory = await updateResponse.json();
    expect(updatedCategory.name).toBe('Updated Category Name');
    expect(updatedCategory.description).toBe('Updated description');
  });
});

test.describe('Tags API', () => {
  test('should get all tags', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/tags`);
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('should create a tag', async ({ request }) => {
    const newTag = {
      name: 'Test Tag ' + Date.now(),
      slug: 'test-tag-' + Date.now(),
    };

    const response = await request.post(`${API_BASE}/api/tags`, {
      data: newTag,
    });

    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.name).toBe(newTag.name);
    expect(data.slug).toBe(newTag.slug);
  });
});

test.describe('OG Image API', () => {
  test('should generate OG image', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/og?title=Test Title&excerpt=Test excerpt`);
    
    expect(response.ok()).toBeTruthy();
    
    // Check response is an image
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('image');
  });

  test('should require title parameter', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/og`);
    
    expect(response.status()).toBe(400);
  });
});
