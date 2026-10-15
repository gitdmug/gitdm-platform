import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getDb } from "@/lib/db";
import { GITDM } from "@/lib/branding";
import { money } from "@/lib/status";

export const dynamic = "force-dynamic";
export const metadata = {
  title: `Store | ${GITDM.shortName}`,
  description: "GITDM public learning materials and handbooks.",
};

const FALLBACK_BOOKS = [
  {
    id: "free-basics",
    name: "Market Basics — Free guide",
    price: 0,
    currency: "UGX",
    description: "Free GITDM introductory learning guide for new market learners.",
    imageUrl: "/media/gitdm-store-basics.jpg",
    free: true,
  },
  {
    id: "handbook-fm",
    name: "GITDM Financial Markets Handbook",
    price: 25000,
    currency: "UGX",
    description: "Official handbook for learners and financial-market professionals.",
    imageUrl: "/media/gitdm-store-handbook-fm.jpg",
    free: false,
  },
  {
    id: "handbook-td",
    name: "GITDM Trading & Derivatives Handbook",
    price: 35000,
    currency: "UGX",
    description: "Official handbook covering trading and derivatives concepts.",
    imageUrl: "/media/gitdm-store-handbook-td.jpg",
    free: false,
  },
];

export default async function PublicStorePage() {
  let products: any[] = [];
  try {
    const db = getDb();
    if (db) {
      products = await db.storeProduct.findMany({
        where: {
          status: "ACTIVE",
          audience: "PUBLIC",
        },
        orderBy: { price: "asc" },
        take: 24,
      });
    }
  } catch (e) {
    console.warn("[store] catalogue query failed", e);
  }

  const items = products.length > 0 ? products : FALLBACK_BOOKS;

  return (
    <main className="min-h-screen bg-slate-50">
      <Header active="Store" />
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow">Public store</div>
          <h1>Learning materials</h1>
          <p>
            Browse free guides and official GITDM handbooks. Enrolled students use the campus store
            for additional digital resources after sign-in.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid grid-3" style={{ gap: 20 }}>
            {items.map((p: any) => {
              const free = Number(p.price) === 0 || p.free;
              return (
                <article className="card" key={p.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.imageUrl || "/media/gitdm-store-fallback.jpg"}
                    alt=""
                    className="public-image card-image"
                    style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 8 }}
                  />
                  <div className="card-body" style={{ paddingTop: 16 }}>
                    <h3 style={{ fontSize: 18 }}>{p.name}</h3>
                    <p className="muted" style={{ fontSize: 14 }}>
                      {p.description || "GITDM learning resource."}
                    </p>
                    <p style={{ fontWeight: 600, marginTop: 8 }}>
                      {free ? "Free" : money(p.price, p.currency || "UGX")}
                    </p>
                    <div className="actions" style={{ marginTop: 16 }}>
                      {free ? (
                        <Link href="/store/free-market-basics" className="btn btn-primary btn-sm">
                          Open free guide
                        </Link>
                      ) : (
                        <Link href="/auth/sign-in?returnTo=/student/library" className="btn btn-outline-dark btn-sm">
                          Sign in to purchase
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="panel" style={{ marginTop: 40 }}>
            <strong>Student campus store</strong>
            <p>
              After enrolment, additional digital books and resources appear in your student library
              and campus store — separate from this public catalogue.
            </p>
            <Link href="/student/library" className="btn btn-outline-dark btn-sm">
              Student library
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
