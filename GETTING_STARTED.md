# Getting Started with AI Coding Blog

This guide will walk you through setting up and running your AI Coding Blog.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Running the Application](#running-the-application)
5. [Creating Your First Post](#creating-your-first-post)
6. [Customization](#customization)
7. [Deployment](#deployment)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Docker** (recommended) - [Install Docker](https://docs.docker.com/get-docker/)
- **Docker Compose** - Usually comes with Docker Desktop
- **Node.js 20+** (if running without Docker) - [Install Node.js](https://nodejs.org/)
- **Git** - [Install Git](https://git-scm.com/)

## Installation

### Step 1: Clone the Repository

```bash
git clone <your-repository-url>
cd "JP MyBlog"
```

### Step 2: Install Dependencies (if not using Docker)

```bash
npm install
```

## Configuration

### Step 1: Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

### Step 2: Update Environment Variables

Open `.env.local` and configure:

```env
# Database - Keep default for Docker, or update for external PostgreSQL
DATABASE_URL="postgresql://bloguser:blogpassword@localhost:5432/aicodingblog"

# Authentication - IMPORTANT: Change this to a random string (min 32 chars)
NEXTAUTH_SECRET="your-super-secret-key-minimum-32-characters-long"
NEXTAUTH_URL="http://localhost:3000"

# App
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Security Note:** For production, generate a strong `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

## Running the Application

### Option 1: Using Docker (Recommended)

This is the easiest way to get started:

```bash
# Start all services (app + PostgreSQL)
docker-compose up -d

# Wait for services to start (about 10-15 seconds)
# You can check status with: docker-compose ps

# Run database migrations
docker-compose exec app npx prisma migrate dev

# Seed the database with sample data
docker-compose exec app npm run db:seed
```

Your blog is now running at: **http://localhost:3000**

### Option 2: Without Docker

If you prefer to run without Docker:

```bash
# Start PostgreSQL separately (example using Docker)
docker run -d \
  --name postgres \
  -e POSTGRES_USER=bloguser \
  -e POSTGRES_PASSWORD=blogpassword \
  -e POSTGRES_DB=aicodingblog \
  -p 5432:5432 \
  postgres:16-alpine

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed

# Start development server
npm run dev
```

Visit: **http://localhost:3000**

## Creating Your First Post

### Step 1: Access the Admin Dashboard

Navigate to: **http://localhost:3000/admin**

### Step 2: Create a New Post

1. Click **"Create New Post"**
2. Fill in the form:
   - **Title**: Your post title (required)
   - **Excerpt**: Short description (optional but recommended)
   - **Content**: Write in Markdown (required)
   - **Cover Image**: URL to an image (optional)
   - **Categories**: Select relevant categories
   - **Tags**: Tag your post
   - **Publish**: Toggle to make it public immediately

### Step 3: Write Content in Markdown

Example post content:

```markdown
# My First AI Blog Post

Welcome to my blog about AI and coding!

## Introduction

This is where I'll share my journey learning AI...

## Key Concepts

- Machine Learning
- Deep Learning
- Neural Networks

## Code Example

\`\`\`python
def hello_ai():
    print("Hello, AI World!")
\`\`\`

## Conclusion

Stay tuned for more posts!
```

### Step 4: Save and Publish

Click **"Create Post"** to save as a draft, or toggle "Publish immediately" first.

## Customization

### Change Blog Title and Description

Edit `app/layout.tsx`:

```typescript
export const metadata: Metadata = {
  title: {
    default: "Your Blog Name",
    template: "%s | Your Blog Name",
  },
  description: "Your blog description",
  // ...
};
```

### Update Homepage

Edit `app/page.tsx` to customize the hero section and layout.

### Add More Categories

Navigate to **http://localhost:3000/admin** and create categories through the admin interface, or add them directly in the seed script.

### Customize Theme Colors

Edit `app/globals.css` to change color variables:

```css
:root {
  --primary: 222.2 47.4% 11.2%;
  --secondary: 210 40% 96.1%;
  /* ... */
}
```

### Change Fonts

Edit `app/layout.tsx` to use different Google Fonts:

```typescript
import { Roboto, Fira_Code } from "next/font/google";

const roboto = Roboto({
  weight: ['400', '700'],
  subsets: ["latin"],
  variable: "--font-roboto",
});
```

## Useful Commands

### Database Management

```bash
# Open Prisma Studio (visual database editor)
npm run db:studio

# Create a new migration
npm run db:migrate

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Generate Prisma Client (after schema changes)
npm run db:generate
```

### Docker Commands

```bash
# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild after changes
docker-compose up -d --build

# Access app container shell
docker-compose exec app sh

# View database logs
docker-compose logs postgres
```

### Development

```bash
# Type check
npm run type-check

# Lint code
npm run lint

# Build for production
npm run build

# Start production server
npm run start
```

## Deployment

See [README.md](./README.md#deployment) for detailed deployment instructions for:

- Docker Compose (Production)
- Azure Container Instances
- AWS ECS
- Google Cloud Run
- Vercel (requires database separately)

### Quick Production Deploy with Docker

```bash
# Create production env file
cp .env.example .env

# Update .env with production values

# Start production stack
docker-compose -f docker-compose.production.yml up -d --build

# Run migrations
docker-compose -f docker-compose.production.yml exec app npx prisma migrate deploy
```

## Troubleshooting

### Port Already in Use

If port 3000 or 5432 is in use:

```bash
# Change ports in docker-compose.yml
ports:
  - "3001:3000"  # Change 3000 to 3001
```

### Database Connection Failed

1. Check if PostgreSQL is running:
   ```bash
   docker-compose ps
   ```

2. Verify `DATABASE_URL` in `.env.local`

3. View PostgreSQL logs:
   ```bash
   docker-compose logs postgres
   ```

### Prisma Client Not Generated

```bash
# In Docker
docker-compose exec app npx prisma generate

# Locally
npm run db:generate
```

### Changes Not Reflecting

```bash
# Clear Next.js cache
rm -rf .next

# Restart Docker services
docker-compose restart app
```

## Next Steps

1. **Customize your blog** - Update colors, fonts, and layout
2. **Write content** - Create posts about AI, coding, and tech
3. **Add features** - Comments, newsletter, analytics
4. **Deploy** - Share your blog with the world
5. **SEO** - Optimize for search engines (sitemap included)

## Getting Help

- Check the [README.md](./README.md) for more details
- Review the code - it's well-commented
- Open an issue on GitHub

---

**Happy Blogging! 🚀**
