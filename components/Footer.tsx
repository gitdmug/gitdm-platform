import Link from "next/link";
import { GITDM } from "@/lib/branding";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <strong>{GITDM.name}</strong>
          <p className="footer-muted">
            {GITDM.tagline}. A digital institution for financial markets education,
            admissions, learning, assessment and academic records.
          </p>
        </div>
        <div>
          <h4>Explore</h4>
          <ul className="footer-links">
            <li><Link href="/about">About GITDM</Link></li>
            <li><Link href="/programmes">Programmes</Link></li>
            <li><Link href="/admissions">Admissions</Link></li>
            <li><Link href="/trading-floor">Trading Floor</Link></li>
            <li><Link href="/partners">Partners</Link></li>
            <li><Link href="/research">Insights</Link></li>
            <li><Link href="/disclaimer">Trading &amp; Education Disclaimer</Link></li>
            <li><Link href="/terms">Terms &amp; Conditions</Link></li>
          </ul>
        </div>
        <div>
          <h4>Campus</h4>
          <ul className="footer-links">
            <li><Link href="/campus">Student Campus</Link></li>
            <li><Link href="/control-centre">Control Centre</Link></li>
            <li><a href="/auth/campus-login">Campus login</a></li>
            <li><a href="/auth/signup">Create account</a></li>
            <li><Link href="/install">Install app</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4>Contact</h4>
          <ul className="footer-links">
            <li>{GITDM.location}</li>
            <li>
              Support: <a href={`mailto:${GITDM.supportEmail}`}>{GITDM.supportEmail}</a>
            </li>
            <li>
              Admissions: <a href={`mailto:${GITDM.admissionsEmail}`}>{GITDM.admissionsEmail}</a>
            </li>
            <li>WhatsApp {GITDM.whatsapp}</li>
            <li>
              <a href={GITDM.website} target="_blank" rel="noreferrer">
                {GITDM.website.replace("https://", "")}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} {GITDM.legalName}. All rights reserved.</span>
      </div>
    </footer>
  );
}
