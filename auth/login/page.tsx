import { redirect } from "next/navigation";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo } = await searchParams;
  redirect(`/auth/sign-in${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`);
}
