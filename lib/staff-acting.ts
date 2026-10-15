import { cookies } from "next/headers";
import type { RoleCode } from "@/lib/permissions";

const COOKIE = "gitdm_acting_role";

// Principal role impersonation has been retired. Ignore any stale cookies left
// by earlier deployments so Principal always acts with their own authority.
export function isActableStaffRole(_value: string): _value is RoleCode { return false; }
export async function getActingRole(): Promise<RoleCode | null> {
  const store = await cookies();
  if (store.has(COOKIE)) store.delete(COOKIE);
  return null;
}
export async function setActingRole(role: RoleCode | null) {
  const store = await cookies();
  if (role) throw new Error("Temporary role impersonation has been retired. Use department oversight instead.");
  store.delete(COOKIE);
}
