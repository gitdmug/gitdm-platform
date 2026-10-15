import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getStorage, neonFileId } from "@/lib/file-storage";

const bucket = process.env.NEON_STORAGE_BUCKET || "gitdm-files";

export async function databaseFileResponse(raw: string, disposition: "inline" | "attachment" = "inline") {
  if (!raw.startsWith("neonfile:")) return null;
  const db = getDb();
  if (!db) return new NextResponse("Database unavailable", { status: 503 });
  const id = neonFileId(raw);
  const file = await db.fileAsset.findUnique({ where: { id } });
  if (!file) return new NextResponse("File not found", { status: 404 });

  try {
    const object = await getStorage().send(new GetObjectCommand({ Bucket: bucket, Key: file.storageKey }));
    if (!object.Body) return new NextResponse("File unavailable", { status: 503 });
    const bytes = new Uint8Array(await object.Body.transformToByteArray());
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(file.size),
        "Content-Disposition": `${disposition}; filename="${encodeURIComponent(file.originalName)}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Neon Object Storage download failed:", error);
    return new NextResponse("File unavailable", { status: 503 });
  }
}
