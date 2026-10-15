export const dynamic = "force-dynamic";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50">
      <Header />
      <div className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
        <p className="text-sm font-medium text-emerald-700">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Page not found</h1>
        <p className="mt-3 text-slate-600">
          The page you requested does not exist or has moved.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/"
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white"
          >
            Home
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Dashboard
          </Link>
        </div>
      </div>
      <Footer />
    </main>
  );
}
