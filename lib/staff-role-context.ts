import { cookies } from "next/headers";
import type { RoleCode } from "@/lib/permissions";

const COOKIE = "gitdm_staff_active_role";

export async function getActiveStaffRole(): Promise<RoleCode | null> {
  const value = (await cookies()).get(COOKIE)?.value;
  return value ? value as RoleCode : null;
}

export async function setActiveStaffRole(role: RoleCode | null) {
  const store = await cookies();
  if (!role) { store.delete(COOKIE); return; }
  store.set(COOKIE, role, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
}
