import type { Metadata } from "next";
import "./globals.css";
import { GITDM } from "@/lib/branding";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { GITDMAssistant } from "@/components/GITDMAssistant";
import { RegisterSW } from "@/components/RegisterSW";

export const metadata: Metadata = {
  title: {
    default: `${GITDM.shortName} | ${GITDM.name}`,
    template: `%s | ${GITDM.shortName}`,
  },
  description:
    "Global Institute of Trading and Derivatives Markets — Education for the Financial Markets. Admissions, campus, assessments and academic records.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://globalinstituteoftrading.com"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: GITDM.name,
    description: GITDM.tagline,
    url: GITDM.website,
    siteName: GITDM.shortName,
    locale: "en_UG",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}<GITDMAssistant /><GoogleAnalytics /><RegisterSW /></body>
    </html>
  );
}
