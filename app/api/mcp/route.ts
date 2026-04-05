import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

async function buildServer(): Promise<McpServer> {
  const server = new McpServer({ name: "jp-myblog", version: "1.0.0" });

  server.tool(
    "list-posts",
    "List published blog posts. Filter by category slug, tag slug, or keyword search.",
    {
      limit: z.number().int().min(1).max(50).optional(),
      page: z.number().int().min(1).optional(),
      category: z.string().optional(),
      tag: z.string().optional(),
      search: z.string().optional(),
    },
    async ({ limit = 10, page = 1, category, tag, search }) => {
      const skip = (page - 1) * limit;
      const where: Record<string, unknown> = { published: true };
      if (category) where.categories = { some: { category: { slug: category } } };
      if (tag) where.tags = { some: { tag: { slug: tag } } };
      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { excerpt: { contains: search, mode: "insensitive" } },
        ];
      }

      const [posts, total] = await Promise.all([
        prisma.post.findMany({
          where,
          select: {
            id: true, title: true, slug: true, excerpt: true,
            publishedAt: true, readingTime: true,
            categories: { select: { category: { select: { name: true, slug: true } } } },
            tags: { select: { tag: { select: { name: true, slug: true } } } },
          },
          orderBy: { publishedAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.post.count({ where }),
      ]);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            posts: posts.map((p) => ({
              id: p.id, title: p.title, slug: p.slug,
              excerpt: p.excerpt ?? "", readingTime: p.readingTime,
              publishedAt: p.publishedAt?.toISOString() ?? "",
              categories: p.categories.map((c) => c.category.name),
              tags: p.tags.map((t) => t.tag.name),
            })),
            total, page, limit,
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "get-post",
    "Get the full content of a single published blog post by slug.",
    { slug: z.string() },
    async ({ slug }) => {
      const post = await prisma.post.findFirst({
        where: { slug, published: true },
        select: {
          id: true, title: true, slug: true, excerpt: true, content: true,
          publishedAt: true, readingTime: true,
          author: { select: { name: true } },
          categories: { select: { category: { select: { name: true, slug: true } } } },
          tags: { select: { tag: { select: { name: true, slug: true } } } },
        },
      });

      if (!post) {
        return {
          content: [{ type: "text" as const, text: `No published post found with slug: ${slug}` }],
          isError: true,
        };
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            id: post.id, title: post.title, slug: post.slug,
            excerpt: post.excerpt ?? "", content: post.content,
            publishedAt: post.publishedAt?.toISOString() ?? "",
            readingTime: post.readingTime, author: post.author.name,
            categories: post.categories.map((c) => c.category),
            tags: post.tags.map((t) => t.tag),
          }, null, 2),
        }],
      };
    }
  );

  server.tool("list-categories", "List all blog categories.", {}, async () => {
    const cats = await prisma.category.findMany({
      select: {
        name: true, slug: true, description: true,
        _count: { select: { posts: { where: { post: { published: true } } } } },
      },
      orderBy: { name: "asc" },
    });
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(cats.map((c) => ({
          name: c.name, slug: c.slug, description: c.description ?? "",
          postCount: c._count.posts,
        })), null, 2),
      }],
    };
  });

  server.tool("list-tags", "List all blog tags.", {}, async () => {
    const tags = await prisma.tag.findMany({
      select: {
        name: true, slug: true,
        _count: { select: { posts: { where: { post: { published: true } } } } },
      },
      orderBy: { name: "asc" },
    });
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(tags.map((t) => ({
          name: t.name, slug: t.slug, postCount: t._count.posts,
        })), null, 2),
      }],
    };
  });

  return server;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const server = await buildServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    const responsePromise = new Promise<Response>((resolve) => {
      let status = 200;
      const headers: Record<string, string> = {};
      const chunks: Uint8Array[] = [];

      const fakeRes = {
        writeHead(s: number, h?: Record<string, string>) {
          status = s;
          if (h) Object.assign(headers, h);
        },
        setHeader(k: string, v: string) { headers[k] = v; },
        write(chunk: Uint8Array | string) {
          chunks.push(typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk);
          return true;
        },
        end(chunk?: Uint8Array | string) {
          if (chunk) chunks.push(typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk);
          const total = chunks.reduce((a, b) => a + b.byteLength, 0);
          const merged = new Uint8Array(total);
          let offset = 0;
          for (const c of chunks) { merged.set(c, offset); offset += c.byteLength; }
          resolve(new Response(merged, { status, headers }));
        },
        on() { return this; },
      };

      const fakeReq = {
        method: "POST",
        url: "/api/mcp",
        headers: Object.fromEntries(request.headers.entries()),
        on() { return this; },
      };

      transport.handleRequest(fakeReq as never, fakeRes as never, body);
    });

    await server.connect(transport);
    return await responsePromise;
  } catch (error) {
    console.error("MCP error", { error });
    return NextResponse.json({ error: "MCP server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "jp-myblog MCP Server",
    description: "Exposes blog posts, categories, and tags via the Model Context Protocol.",
    tools: ["list-posts", "get-post", "list-categories", "list-tags"],
    endpoint: "/api/mcp",
    transport: "streamable-http",
  });
}
