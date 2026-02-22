import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Hash the default password
  const passwordHash = await bcrypt.hash('admin123', 10);

  // Create admin user (update password if exists)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@aicodingblog.com' },
    update: {
      passwordHash, // Update password on every seed
    },
    create: {
      email: 'admin@aicodingblog.com',
      name: 'Admin User',
      passwordHash,
      role: 'admin',
      bio: 'AI and software development enthusiast',
    },
  });

  console.log('Created admin user:', adminUser.email);

  // Create categories
  const aiCategory = await prisma.category.upsert({
    where: { slug: 'artificial-intelligence' },
    update: {},
    create: {
      name: 'Artificial Intelligence',
      slug: 'artificial-intelligence',
      description: 'Posts about AI, machine learning, and deep learning',
    },
  });

  const webdevCategory = await prisma.category.upsert({
    where: { slug: 'web-development' },
    update: {},
    create: {
      name: 'Web Development',
      slug: 'web-development',
      description: 'Modern web development techniques and frameworks',
    },
  });

  const tutorialCategory = await prisma.category.upsert({
    where: { slug: 'tutorials' },
    update: {},
    create: {
      name: 'Tutorials',
      slug: 'tutorials',
      description: 'Step-by-step guides and tutorials',
    },
  });

  console.log('Created categories');

  // Create tags
  const tags = await Promise.all([
    prisma.tag.upsert({
      where: { slug: 'typescript' },
      update: {},
      create: { name: 'TypeScript', slug: 'typescript' },
    }),
    prisma.tag.upsert({
      where: { slug: 'nextjs' },
      update: {},
      create: { name: 'Next.js', slug: 'nextjs' },
    }),
    prisma.tag.upsert({
      where: { slug: 'react' },
      update: {},
      create: { name: 'React', slug: 'react' },
    }),
    prisma.tag.upsert({
      where: { slug: 'prisma' },
      update: {},
      create: { name: 'Prisma', slug: 'prisma' },
    }),
    prisma.tag.upsert({
      where: { slug: 'docker' },
      update: {},
      create: { name: 'Docker', slug: 'docker' },
    }),
    prisma.tag.upsert({
      where: { slug: 'machine-learning' },
      update: {},
      create: { name: 'Machine Learning', slug: 'machine-learning' },
    }),
  ]);

  console.log('Created tags');

  // Create sample blog post (only if it doesn't exist)
  const existingPost = await prisma.post.findUnique({
    where: { slug: 'building-modern-ai-applications-nextjs' },
  });

  if (!existingPost) {
    const samplePost = await prisma.post.create({
      data: {
        title: 'Building Modern AI Applications with Next.js',
        slug: 'building-modern-ai-applications-nextjs',
        excerpt: 'Learn how to build production-ready AI applications using Next.js 15, TypeScript, and modern tools.',
        content: `# Building Modern AI Applications with Next.js

Welcome to our first tutorial on building AI-powered applications!

## Introduction

In this comprehensive guide, we'll explore how to build modern, production-ready AI applications using cutting-edge technologies.

## Key Technologies

- **Next.js 15**: The latest version of the React framework
- **TypeScript**: For type-safe development
- **Prisma**: Modern database toolkit
- **Docker**: Containerization for consistent environments

## Getting Started

\`\`\`typescript
// Example: Simple API route
export async function GET() {
  return Response.json({ message: 'Hello from AI Blog!' });
}
\`\`\`

## Conclusion

Building AI applications has never been easier with modern tools and frameworks. Stay tuned for more tutorials!
`,
        published: true,
        featured: true,
        publishedAt: new Date(),
        readingTime: 5,
        authorId: adminUser.id,
        categories: {
          create: [
            { categoryId: aiCategory.id },
            { categoryId: tutorialCategory.id },
          ],
        },
        tags: {
          create: [
            { tagId: tags[0].id }, // TypeScript
            { tagId: tags[1].id }, // Next.js
            { tagId: tags[2].id }, // React
          ],
        },
      },
    });

    console.log('Created sample post:', samplePost.title);
  } else {
    console.log('Sample post already exists, skipping');
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
