import { redirect } from "next/navigation";

export default function CampusLoginPage() {
  redirect("/auth/sign-in?returnTo=/campus");
}
