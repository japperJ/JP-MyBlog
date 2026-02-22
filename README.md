# AI Coding Blog

A modern, production-ready blogging platform built with Next.js 15, TypeScript, Prisma, and PostgreSQL. Optimized for writing technical content about AI, machine learning, and software development.

## Features

✨ **Modern Stack**
- Next.js 15 with App Router
- TypeScript for type safety
- Prisma ORM for database management
- PostgreSQL with full-text search
- Tailwind CSS + shadcn/ui components

📝 **Content Management**
- Markdown support with syntax highlighting
- Category and tag organization
- Draft and publish workflow
- Featured posts
- Reading time calculation
- View counter
- Media library for image management
- Auto-generated OG images for social sharing

🎨 **User Experience**
- Dark/light mode
- Responsive design
- Reading progress indicator
- Code blocks with copy button
- SEO optimized
- Fast page loads with SSG

🧪 **Testing**
- E2E testing with Playwright
- API route testing
- Component testing
- Responsive design testing

� **Security & Authentication**
- Session-based auth with HTTP-only cookies
- Multi-Factor Authentication (MFA/TOTP)
- QR code setup via any authenticator app
- Bcrypt password hashing
- Middleware-protected admin routes

�🐳 **Docker-First**
- Development environment with hot reload
- Production-ready multi-stage builds
- Cloud-agnostic deployment
- Persistent volumes for uploads

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development without Docker)
- Git

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd "JP MyBlog"
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and update:
   - `DATABASE_URL`: PostgreSQL connection string
   - `NEXTAUTH_SECRET`: Random string (min 32 characters)

3. **Start with Docker** (Recommended)
   ```bash
   # Start all services
   docker-compose up -d
   
   # Run database migrations
   docker-compose exec app npx prisma migrate dev
   
   # Seed the database with sample data
   docker-compose exec app npm run db:seed
   ```

4. **Or run locally without Docker**
   ```bash
   # Install dependencies
   npm install
   
   # Start PostgreSQL (you'll need it running separately)
   # e.g., using Docker: docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=blogpassword postgres:16-alpine
   
   # Run migrations
   npm run db:migrate
   
   # Seed database
   npm run db:seed
   
   # Start development server
   npm run dev
   ```

5. **Open your browser**
   - Blog: http://localhost:3001
   - Admin Login: http://localhost:3001/admin/login
   - Prisma Studio: `npm run db:studio`

### Admin Credentials

After seeding, you can log in with:
- **Email**: admin@aicodingblog.com
- **Password**: admin123

**Important:** Change the default password in production!

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── (public)/          # Public-facing pages
│   │   ├── page.tsx       # Homepage
│   │   └── blog/          # Blog pages
│   ├── admin/             # Admin dashboard
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # shadcn/ui base components
│   ├── blog/             # Blog-specific components
│   └── navigation.tsx    # Global navigation
├── lib/                   # Utility functions
│   ├── prisma.ts         # Prisma client
│   ├── markdown.ts       # Markdown processing
│   ├── auth.ts           # Authentication
│   └── utils.ts          # Helper functions
├── prisma/               # Database schema and migrations
│   ├── schema.prisma     # Database models
│   └── seed.ts           # Sample data
├── public/               # Static files
│   └── uploads/          # User uploads (persisted in Docker volume)
├── docker-compose.yml    # Development environment
├── docker-compose.production.yml  # Production environment
├── Dockerfile            # Production image
└── Dockerfile.dev        # Development image
```

## Database Schema

- **User**: Admin user with authentication
- **Post**: Blog posts with markdown content
- **Category**: Post categorization
- **Tag**: Post tagging
- **Session**: User sessions
- **PostCategory**: Many-to-many relationship
- **PostTag**: Many-to-many relationship

## API Routes

### Posts
- `GET /api/posts` - List posts (with pagination, filtering)
- `POST /api/posts` - Create post
- `GET /api/posts/[id]` - Get post by ID
- `PATCH /api/posts/[id]` - Update post
- `DELETE /api/posts/[id]` - Delete post
- `GET /api/posts/slug/[slug]` - Get post by slug

### Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category

### Tags
- `GET /api/tags` - List tags
- `POST /api/tags` - Create tag

### Upload
- `POST /api/upload` - Upload image (max 5MB, JPEG/PNG/GIF/WebP)

### OG Images
- `GET /api/og?title=...&excerpt=...&category=...` - Generate Open Graph image

## Media Library

The media library allows you to upload and manage images for your blog posts:

1. Navigate to `/admin/media`
2. Click the upload area or drag and drop an image
3. Copy the generated URL
4. Use the URL in your post's cover image field

**Features:**
- Upload images via drag-and-drop or file picker
- Automatic image URL generation
- Copy-to-clipboard functionality
- Recently uploaded images display
- Supported formats: JPG, PNG, GIF, WebP
- Max file size: 5MB

## Open Graph Images

All blog posts automatically generate beautiful OG images for social sharing. These images are generated on-demand using `@vercel/og` and include:

- Post title
- Excerpt
- Category name
- Blog branding

**Usage:**
- OG images are generated automatically for all posts
- Falls back to cover image if provided
- Optimized for Twitter Cards and Facebook shares
- 1200x630px (optimal for social platforms)

**Manual generation:**
```
GET /api/og?title=Your+Title&excerpt=Your+excerpt&category=Web+Dev
```

## Testing

The project includes comprehensive tests using Playwright:

### Running Tests

```bash
# Run all tests
npm test

# Run with UI mode
npm run test:ui

# Run in debug mode
npm run test:debug

# View test report
npm run test:report
```

### Test Coverage

**Blog Tests** (`tests/blog.spec.ts`)
- Homepage display and navigation
- Blog listing and filtering
- Individual post pages
- Search functionality
- Responsive design

**API Tests** (`tests/api.spec.ts`)
- Health check endpoint
- Posts CRUD operations
- Categories CRUD operations
- Tags CRUD operations
- OG image generation

**Admin Tests** (`tests/admin.spec.ts`)
- Dashboard display
- Post management
- Category management
- Tag management
- Media library
- Responsive admin interface

### Writing Tests

Tests use Playwright's testing framework:

```typescript
import { test, expect } from '@playwright/test';

test('should display homepage', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Welcome/i })).toBeVisible();
});
```

## Deployment

### Production with Docker Compose

1. **Create production environment file**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with production values:
   ```env
   DATABASE_URL=postgresql://user:password@postgres:5432/dbname
   NEXTAUTH_SECRET=your-super-secret-key-min-32-chars
   NEXTAUTH_URL=https://yourdomain.com
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```

2. **Build and start**
   ```bash
   docker-compose -f docker-compose.production.yml up -d --build
   ```

3. **Run migrations**
   ```bash
   docker-compose -f docker-compose.production.yml exec app npx prisma migrate deploy
   ```

4. **Optional: Seed database**
   ```bash
   docker-compose -f docker-compose.production.yml exec app npm run db:seed
   ```

### Azure Container Instances

1. **Build and push image**
   ```bash
   docker build -t youracr.azurecr.io/ai-blog:latest .
   az acr login --name youracr
   docker push youracr.azurecr.io/ai-blog:latest
   ```

2. **Create PostgreSQL database**
   ```bash
   az postgres flexible-server create \
     --resource-group myResourceGroup \
     --name myblogdb \
     --location eastus \
     --admin-user bloguser \
     --admin-password YourPassword123! \
     --sku-name Standard_B1ms \
     --version 16
   ```

3. **Deploy container**
   ```bash
   az container create \
     --resource-group myResourceGroup \
     --name ai-blog \
     --image youracr.azurecr.io/ai-blog:latest \
     --dns-name-label ai-blog-unique \
     --ports 3000 \
     --environment-variables \
       DATABASE_URL=postgresql://bloguser:YourPassword123!@myblogdb.postgres.database.azure.com:5432/postgres \
       NEXTAUTH_SECRET=your-secret-key \
       NEXTAUTH_URL=https://ai-blog-unique.eastus.azurecontainer.io \
       NEXT_PUBLIC_APP_URL=https://ai-blog-unique.eastus.azurecontainer.io
   ```

### AWS ECS / Google Cloud Run

Similar process:
1. Build and push Docker image to ECR/GCR
2. Set up managed PostgreSQL (RDS/Cloud SQL)
3. Deploy container with environment variables

## Development

### Database Management

```bash
# Generate Prisma Client
npm run db:generate

# Create migration
npm run db:migrate

# Push schema changes (dev only)
npm run db:push

# Open Prisma Studio
npm run db:studio

# Seed database
npm run db:seed
```

### Creating Content

1. Navigate to `/admin`
2. Click "Create New Post"
3. Write content in Markdown
4. Add categories and tags
5. Toggle "Publish immediately" to make it public
6. Click "Create Post"

### Markdown Features

```markdown
# Headings (H1-H6)

**Bold** and *italic* text

[Links](https://example.com)

- Bullet lists
1. Numbered lists

> Blockquotes

\`inline code\`

\`\`\`typescript
// Code blocks with syntax highlighting
function hello() {
  console.log("Hello, world!");
}
\`\`\`

Tables, task lists, and more with GitHub Flavored Markdown
```

## Customization

### Theme Colors
Edit `tailwind.config.ts` andGlobals CSS variables in `app/globals.css`

### Fonts
Update `app/layout.tsx` to change fonts

### Adding Components
Use shadcn/ui CLI:
```bash
npx shadcn@latest add [component-name]
```

## Authentication

The blog platform includes a complete authentication system to protect admin routes.

### How It Works

1. **Session-Based Auth**: Uses secure HTTP-only cookies for session management
2. **Password Hashing**: Bcrypt with 10 salt rounds
3. **Middleware Protection**: All `/admin/*` routes require login (except `/admin/login`)
4. **7-Day Sessions**: Sessions expire after 7 days of inactivity

### Login

Navigate to `/admin/login` and use your credentials:
- Default email: `admin@aicodingblog.com`
- Default password: `admin123`

### Logout

Click the "Logout" button in the admin navigation bar. This will:
- Destroy the session in the database
- Clear the session cookie
- Redirect to the login page

### Creating New Admin Users

To create additional admin users, you can use Prisma Studio or add them to the seed script:

```typescript
import bcrypt from 'bcryptjs';

const passwordHash = await bcrypt.hash('your-password', 10);

await prisma.user.create({
  data: {
    email: 'newadmin@example.com',
    name: 'New Admin',
    passwordHash,
    role: 'admin',
  },
});
```

### Security Best Practices

1. **Change Default Password**: Immediately change `admin123` in production
2. **Enable MFA**: Set up Multi-Factor Authentication for your admin account
3. **Use Strong Passwords**: Minimum 12 characters with mixed case, numbers, symbols
4. **HTTPS Only**: Always use HTTPS in production for secure cookie transmission
5. **Regular Session Cleanup**: Old sessions are automatically cleaned on login
6. **Environment Variables**: Never commit passwords or secrets to version control

### Multi-Factor Authentication (MFA/TOTP)

The platform supports TOTP-based MFA compatible with any standard authenticator app (Google Authenticator, Authy, etc.).

**Enabling MFA:**
1. Go to `/admin/settings`
2. Click **Enable MFA**
3. Scan the QR code with your authenticator app
4. Enter the 6-digit code to confirm

**Disabling MFA:**
1. Go to `/admin/settings`
2. Click **Disable MFA** and confirm with your current TOTP code

Once MFA is enabled, the login flow requires both your password **and** a TOTP code from your authenticator app.

### API Endpoints

- `POST /api/auth/login` - Authenticate user (supports MFA challenge)
- `POST /api/auth/logout` - End session
- `GET /api/auth/session` - Check authentication status
- `POST /api/auth/mfa/generate` - Generate MFA secret and QR code
- `POST /api/auth/mfa/verify` - Verify TOTP token
- `POST /api/auth/mfa/enable` - Enable MFA for the account
- `POST /api/auth/mfa/disable` - Disable MFA for the account

## Performance

- Server-side rendering (SSR) for dynamic content
- Static generation (SSG) for blog posts
- Image optimization with next/image
- Code splitting and lazy loading
- Minimal JavaScript bundle

## SEO

- Dynamic meta tags per page
- Open Graph images
- Structured data (JSON-LD)
- Sitemap generation
- RSS feed

## Troubleshooting

**Database connection issues:**
- Check `DATABASE_URL` in `.env.local`
- Ensure PostgreSQL container is running: `docker ps`
- View logs: `docker-compose logs postgres`

**Build failures:**
- Clear Next.js cache: `rm -rf .next`
- Rebuild Docker image: `docker-compose build --no-cache`

**Prisma errors:**
- Regenerate client: `npm run db:generate`
- Reset database: `npx prisma migrate reset`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this for your own blog!

## Support

For issues and questions:
- GitHub Issues: [your-repo]/issues
- Documentation: This README

---

Built with ❤️ using Next.js 15, TypeScript, Prisma, and PostgreSQL
