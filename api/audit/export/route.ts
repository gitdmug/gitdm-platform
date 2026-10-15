import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roleCodes = (user.roles || []).map((r: any) => r.role?.code).filter(Boolean);
  if (!roleCodes.includes("PRINCIPAL") && !roleCodes.includes("ACADEMIC_DIRECTOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const days = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get("days") || 30), 1),
    365
  );
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const logs = await db.auditLog.findMany({
    where: { createdAt: { gte: since } },
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });

  const header = "createdAt,action,entity,entityId,userEmail,severity\n";
  const rows = logs
    .map((l) => {
      const email = l.user?.email || "";
      const meta = (l.metadataJson || "").replaceAll('"', '""');
      return `"${l.createdAt.toISOString()}","${l.action}","${l.entity}","${l.entityId || ""}","${email}","${meta}"`;
    })
    .join("\n");

  return new NextResponse(header + rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gitdm-audit-${days}d.csv"`,
    },
  });
}
