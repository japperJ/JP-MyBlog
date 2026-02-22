import { prisma } from "@/lib/prisma";
import { Navigation } from "@/components/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: {
          posts: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <>
      <Navigation />
      <main className="min-h-screen">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-12">
            <h1 className="text-4xl font-bold mb-4">Categories</h1>
            <p className="text-muted-foreground text-lg">
              Browse posts by category
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Link key={category.id} href={`/blog/category/${category.slug}`}>
                <Card className="hover:shadow-lg transition-shadow h-full">
                  <CardHeader>
                    <CardTitle>{category.name}</CardTitle>
                    {category.description && (
                      <CardDescription>{category.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {category._count.posts} {category._count.posts === 1 ? "post" : "posts"}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
