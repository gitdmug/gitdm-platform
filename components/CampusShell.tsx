"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useMemo, useState } from "react";

export type CampusNavItem = {
  href: string;
  label: string;
  children?: { href: string; label: string }[];
};

type Props = {
  title: string;
  subtitle?: string;
  items: CampusNavItem[];
  userLabel?: string;
  children: ReactNode;
};

export function CampusShell({ title, subtitle, items, userLabel, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const initialExpanded = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.children?.some((c) => pathname === c.href || pathname.startsWith(c.href + "/"))) {
        set.add(item.href);
      }
    }
    return set;
  }, [items, pathname]);

  const [expanded, setExpanded] = useState<Set<string>>(initialExpanded);

  function isActive(href: string) {
    if (href === "/student" || href === "/staff" || href === "/applicant") {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + "/");
  }

  function toggleGroup(href: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      return next;
    });
  }

  return (
    <div className="campus-shell">
      <aside className={`campus-sidebar ${open ? "open" : ""}`}>
        <div className="campus-brand">
          <Link href="/" className="campus-brand-link">
            <span className="campus-brand-mark">GITDM</span>
            <span className="campus-brand-sub">{title}</span>
          </Link>
        </div>
        <nav className="campus-nav">
          {items.map((item) => {
            if (item.children && item.children.length > 0) {
              const groupOpen = expanded.has(item.href) || item.children.some((c) => isActive(c.href));
              const groupActive = item.children.some((c) => isActive(c.href));
              return (
                <div key={item.href} className="campus-nav-group">
                  <button
                    type="button"
                    className={`campus-nav-item campus-nav-group-btn ${groupActive ? "active" : ""}`}
                    onClick={() => toggleGroup(item.href)}
                    aria-expanded={groupOpen}
                  >
                    <span className="campus-nav-label">{item.label}</span>
                    <span className="campus-nav-chevron">{groupOpen ? "▾" : "▸"}</span>
                  </button>
                  {groupOpen && (
                    <div className="campus-nav-sub">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`campus-nav-item campus-nav-sub-item ${isActive(child.href) ? "active" : ""}`}
                          onClick={() => setOpen(false)}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`campus-nav-item ${isActive(item.href) ? "active" : ""}`}
                onClick={() => setOpen(false)}
              >
                <span className="campus-nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="campus-sidebar-foot">
          <Link href="/" className="campus-nav-item" onClick={() => setOpen(false)}>
            Public site
          </Link>
          <Link href="/auth/logout" className="campus-nav-item">
            Sign out
          </Link>
        </div>
      </aside>

      <div className="campus-main">
        <header className="campus-topbar">
          <button
            type="button"
            className="campus-menu-btn"
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
          >
            ☰
          </button>
          <div>
            <div className="campus-topbar-title">{subtitle || title}</div>
          </div>
          <div className="campus-topbar-user">{userLabel || "Campus"}</div>
        </header>
        <div className="campus-content">{children}</div>
      </div>

      {open && <div className="campus-overlay" onClick={() => setOpen(false)} />}
    </div>
  );
}
