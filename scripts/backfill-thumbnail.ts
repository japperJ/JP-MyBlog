import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const THUMBNAIL_URL =
  "https://rcmjkyfhix67oxdz.public.blob.vercel-storage.com/uploads/1775411629370-image--7-.jpg";

async function main() {
  const result = await prisma.post.updateMany({
    where: {
      thumbnailUrl: null,
    },
    data: {
      thumbnailUrl: THUMBNAIL_URL,
    },
  });

  console.log(`Updated ${result.count} posts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
