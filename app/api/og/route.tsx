import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const title = searchParams.get("title");
    const excerpt = searchParams.get("excerpt");
    const category = searchParams.get("category");

    if (!title) {
      return new Response("Missing title parameter", { status: 400 });
    }

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: "80px",
            backgroundImage: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "12px",
                background: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
              }}
            >
              ✨
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span
                style={{
                  fontSize: "32px",
                  fontWeight: "bold",
                  color: "white",
                }}
              >
                AI Coding Blog
              </span>
              {category && (
                <span
                  style={{
                    fontSize: "20px",
                    color: "rgba(255, 255, 255, 0.9)",
                  }}
                >
                  {category}
                </span>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              maxWidth: "900px",
            }}
          >
            <h1
              style={{
                fontSize: "72px",
                fontWeight: "bold",
                color: "white",
                lineHeight: 1.2,
                margin: 0,
                textShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
              }}
            >
              {title}
            </h1>
            {excerpt && (
              <p
                style={{
                  fontSize: "28px",
                  color: "rgba(255, 255, 255, 0.95)",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {excerpt.slice(0, 150)}
                {excerpt.length > 150 ? "..." : ""}
              </p>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "24px",
              color: "rgba(255, 255, 255, 0.9)",
            }}
          >
            <span>Read more at ai-coding-blog.dev</span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error("Error generating OG image:", error);
    return new Response("Failed to generate image", { status: 500 });
  }
}
