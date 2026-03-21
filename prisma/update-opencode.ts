import { PrismaClient } from '@prisma/client';

/**
 * Post-deployment script to add cover image to OpenCode blog post
 * Run this after deploying to ensure the blog post has the cover image
 */
const prisma = new PrismaClient();

async function updateOpenCodePost() {
  try {
    console.log('🔍 Searching for OpenCode blog post...');
    
    const post = await prisma.post.findFirst({
      where: {
        title: {
          contains: 'OpenCode',
          mode: 'insensitive'
        }
      }
    });

    if (!post) {
      console.log('⚠️  OpenCode post not found in database');
      return;
    }

    if (post.coverImage === '/uploads/opencode-cover.png') {
      console.log('✅ OpenCode post already has the cover image');
      return;
    }

    console.log('📝 Updating post:', post.title);
    
    const updated = await prisma.post.update({
      where: { id: post.id },
      data: {
        coverImage: '/uploads/opencode-cover.png'
      }
    });

    console.log('✨ SUCCESS! Updated OpenCode post with cover image');
    console.log('   Cover Image URL:', updated.coverImage);
    
  } catch (error) {
    console.error('❌ Error updating post:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateOpenCodePost();
}

export { updateOpenCodePost };
