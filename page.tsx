import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";

/** Legacy Control Centre URLs → staff workspaces. */
const MAP: Record<string, string> = {
  support: "/staff/student-affairs",
  profile: "/student/profile",
  admissions: "/staff/admissions",
  finance: "/staff/finance",
  academic: "/staff/academic",
};

export default async function ControlCentreCatchAll({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const first = slug?.[0] || "";

  if (!first) {
    const user = await getCurrentUser();
    if (!user) redirect("/auth/sign-in?returnTo=/staff/principal");
    const roleCodes = (user.roles || []).map((r: any) => r.role?.code).filter(Boolean);
    if (roleCodes.includes("PRINCIPAL") || roleCodes.includes("ACADEMIC_DIRECTOR")) {
      redirect("/staff/principal");
    }
    redirect("/staff");
  }

  redirect(MAP[first] || "/staff");
}
