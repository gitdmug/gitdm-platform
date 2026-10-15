import { getDb } from "@/lib/db";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

const bucket = process.env.NEON_STORAGE_BUCKET || "gitdm-files";

function storage() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const endpoint = process.env.AWS_ENDPOINT_URL_S3?.trim();
  const region = process.env.AWS_REGION?.trim() || "us-east-2";
  if (!accessKeyId || !secretAccessKey || !endpoint) {
    throw new Error("Neon Object Storage is not configured. Set the AWS_* storage variables and NEON_STORAGE_BUCKET.");
  }
  return new S3Client({ region, endpoint, forcePathStyle: true, credentials: { accessKeyId, secretAccessKey } });
}

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_.-]/g, "-").slice(0, 80) || "upload";
}

export async function uploadPrivateFile(file: File, folder: string, ownerKey: string) {
  if (!(file instanceof File) || file.size === 0) throw new Error("Please select a file.");
  if (file.size > 250 * 1024 * 1024) throw new Error("Files must be 250 MB or smaller.");

  const db = getDb();
  if (!db) throw new Error("File storage is unavailable because the database is not configured.");

  const key = `${safeSegment(folder)}/${safeSegment(ownerKey)}/${Date.now()}-${randomUUID()}-${safeSegment(file.name || "upload")}`;
  await storage().send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: new Uint8Array(await file.arrayBuffer()),
    ContentType: file.type || "application/octet-stream",
  }));

  const owner = ownerKey ? await db.user.findUnique({ where: { id: ownerKey }, select: { id: true } }).catch(() => null) : null;
  const asset = await db.fileAsset.create({
    data: {
      ownerUserId: owner?.id ?? null,
      originalName: file.name || "upload",
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      purpose: folder,
      storageKey: key,
    },
    select: { id: true },
  });
  return `neonfile:${asset.id}`;
}

export function isNeonFile(value: string) { return value.startsWith("neonfile:"); }
export function neonFileId(value: string) { return value.slice("neonfile:".length); }
export function getStorage() { return storage(); }
