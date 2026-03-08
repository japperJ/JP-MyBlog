# Quickstart: Your Blog Running on Vercel in 5 Minutes

In 5 minutes, you'll have a fully functional blog deployed on Vercel with an admin dashboard, SEO metadata, and a sample post — all on the free Hobby tier.

## What you'll need

- A [GitHub](https://github.com) account
- A [Vercel](https://vercel.com) account (free Hobby tier works)
- A PostgreSQL database — [Neon](https://neon.tech) offers a free tier that works perfectly

## Step 1: Fork and clone the repository

```bash
git clone https://github.com/japperJ/JP-MyBlog.git
cd JP-MyBlog
npm install
```

## Step 2: Create your database

Sign up at [neon.tech](https://neon.tech), create a new project, and copy the connection string. It looks like this:

```
postgresql://user:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

## Step 3: Configure environment and seed data

```bash
cp .env.example .env.local
```

Open `.env.local` and set your values:

```env
DATABASE_URL="postgresql://user:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
MFA_TOKEN_SECRET="any-random-string-at-least-32-characters-long"
```

Push the schema and seed starter content:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

## Step 4: Deploy to Vercel

1. Push your fork to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import your repository.
3. Add two environment variables in the Vercel dashboard:
   - `DATABASE_URL` → your Neon connection string
   - `MFA_TOKEN_SECRET` → same secret you used locally
4. Click **Deploy**.

> You can leave `NEXT_PUBLIC_APP_URL` unset on Vercel. The app automatically detects the deployment URL.

## Step 5: See your blog

Once the deploy finishes (about 60 seconds), open your Vercel URL. You'll see:

- **Homepage** with the sample "Building Modern AI Applications with Next.js" post
- **Admin dashboard** at `/admin/login` — sign in with:
  - Email: `admin@aicodingblog.com`
  - Password: `admin123`

🎉 **You have a live blog.** Create your first real post from the admin dashboard right now.

## What's next?

- [Write your first post](./writing-posts.md) — learn the admin UI, categories, tags, and images
- [Customize your blog](./customization.md) — change the site name, metadata, and theme
- [Troubleshoot common issues](./troubleshooting.md) — if something didn't work, start here
