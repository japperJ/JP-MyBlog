import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { requireAuth } from "@/lib/auth";

// Magic-byte signatures for each allowed MIME type.
// Checked against the raw file bytes so a malicious client
// cannot spoof the type by changing only the Content-Type header.
const MAGIC_SIGNATURES: Record<string, { offset: number; bytes: number[] }[]> =
  {
    "image/jpeg": [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
    "image/png": [
      { offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
    ],
    "image/gif": [{ offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] }],
    // WebP: "RIFF" at 0 and "WEBP" at 8
    "image/webp": [
      { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
      { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
    ],
  };

function hasMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const sigs = MAGIC_SIGNATURES[mimeType];
  if (!sigs) return false;
  return sigs.every(({ offset, bytes }) =>
    bytes.every((b, i) => buffer[offset + i] === b)
  );
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate MIME type against allowlist (client-supplied, checked first for fast rejection)
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Verify actual file contents via magic bytes — prevents MIME type spoofing
    if (!hasMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { error: "File content does not match the declared type." },
        { status: 400 }
      );
    }

    // Generate unique filename — strip any path components to prevent traversal
    const timestamp = Date.now();
    const safeName = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, "-");
    const filename = `${timestamp}-${safeName}`;

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Save file
    const filepath = path.join(uploadsDir, filename);
    await writeFile(filepath, buffer);

    // Return public URL
    const url = `/uploads/${filename}`;

    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    console.error("Error uploading file:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
