import { auth } from "@/lib/auth/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  await auth.signOut();
  return NextResponse.redirect(new URL("/", request.url));
}
