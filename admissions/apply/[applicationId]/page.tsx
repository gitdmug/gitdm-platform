import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { GITDM } from "@/lib/branding";
import { submitApplication, uploadApplicationDocument, payApplicationFee, refreshApplicationFeePayment, submitAdmissionAppeal, submitAdmissionsConsultation } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: `Application | ${GITDM.shortName}` };

const money = (amount: unknown, currency: string) => `${currency} ${Number(amount || 0).toLocaleString("en-UG")}`;
const label = (status: string) => status.replaceAll("_", " ");

export default async function ApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ applicationId: string }>;
  searchParams: Promise<{ submitted?: string; payment?: string; appeal?: string; error?: string; reference?: string }>;
}) {
  const { applicationId } = await params;
  const query = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/auth/sign-in?returnTo=/admissions/apply/${applicationId}`);
  const db = getDb();
  if (!db) throw new Error("Database unavailable.");

  const app = await db.application.findFirst({
    where: { id: applicationId, applicantId: user.id },
    include: {
      programme: { include: { rules: true } },
      documents: true,
      interviews: { orderBy: { scheduledAt: "desc" }, take: 3 },
      decisions: { orderBy: { decidedAt: "desc" }, take: 5 },
      feeInvoice: { include: { payments: { orderBy: { createdAt: "desc" }, take: 5, include: { receipt: true } }, receipts: { orderBy: { issuedAt: "desc" }, take: 3 } } },
    },
  });
  if (!app) notFound();

  const editable = app.status === "DRAFT";
  const hasId = app.documents.some((d) => d.type === "IDENTITY");
  const hasEducation = app.documents.some((d) => d.type === "EDUCATION");
  const feeInvoice = app.feeInvoice;
  const auditLogs = await db.auditLog.findMany({ where: { entity: "Application", entityId: app.id }, orderBy: { createdAt: "desc" }, take: 50 });
  const feePaid = Boolean(feeInvoice && Number(feeInvoice.amountPaid) >= Number(feeInvoice.amount));
  const latestReceipt = feeInvoice?.receipts?.[0];
  const accepted = app.status === "ACCEPTED";
  const rejected = app.status === "REJECTED";
  const activeEnrollment = await db.enrollment.findFirst({ where: { userId: user.id, programmeId: app.programmeId, status: { in: ["ACTIVE", "REPEATING"] } }, orderBy: { createdAt: "desc" } });
  const admittedAndPaid = accepted && activeEnrollment?.accessLevel === "FULL";

  if (admittedAndPaid) {
    return (
      <>
        <Header active="/admissions" />
        <main>
          <section className="page-hero"><div className="container"><div className="eyebrow">Admissions · Application {app.id.slice(-8).toUpperCase()}</div><h1>{app.programme.name}</h1><p>ADMITTED · PAYMENT CLEARED · APPLICATION CLOSED</p></div></section>
          <section className="section"><div className="container">
            <div className="access-banner full" style={{ marginBottom: 24 }}><strong>Your Admissions process is complete.</strong> Your required payment has been cleared and your application has moved beyond Admissions. The records below remain available for your reference.</div>
            <div className="grid grid-3" style={{ marginBottom: 24 }}>
              <div className="panel"><div className="eyebrow">Current status</div><h2>Admitted & paid</h2><p>Admissions has completed its stage.</p></div>
              <div className="panel"><div className="eyebrow">Next step</div><h2>Use Campus</h2><p>Continue with your student onboarding, academic and learning activities.</p><Link href="/campus" className="btn btn-primary btn-sm">Go to Campus</Link></div>
              <div className="panel"><div className="eyebrow">Need help?</div><h2>Consult Admissions</h2><p>If your application is not progressing as expected, contact Admissions directly.</p><a className="btn btn-outline-dark btn-sm" href={`mailto:${GITDM.admissionsEmail}?subject=Admissions consultation — ${app.id.slice(-8).toUpperCase()}`}>Email Admissions</a></div>
            </div>
            <div className="grid grid-2" style={{ alignItems: "start" }}>
              <div className="stack">
                <div className="card"><div className="eyebrow">Applicant information</div><h2>{app.legalName || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}</h2><div className="meta"><span className="chip">{user.email}</span><span className="chip">{app.phone || user.phone || "Phone not supplied"}</span><span className="chip">{app.city || "City not supplied"}</span><span className="chip">{app.country || "Country not supplied"}</span></div><div className="stack" style={{ marginTop: 16 }}><div className="staff-notice"><div><strong>Education</strong><p>{app.educationBackground || "Not supplied"}</p></div></div><div className="staff-notice"><div><strong>Motivation</strong><p>{app.motivation || "Not supplied"}</p></div></div></div></div>
                <div className="card"><div className="eyebrow">Application documents</div><h2>Documents used to apply</h2><div className="stack" style={{ marginTop: 16 }}>{app.documents.map(doc => <div className="staff-notice" key={doc.id}><div><strong>{label(doc.type)}</strong><p>{doc.originalName} · Uploaded {doc.uploadedAt.toLocaleDateString("en-UG")}</p></div><a className="btn btn-outline-dark btn-sm" href={`/api/admissions/documents/${doc.id}`}>Open</a></div>)}{!app.documents.length ? <p>No application documents are on file.</p> : null}</div></div>
              </div>
              <div className="stack">
                <div className="card"><div className="eyebrow">Application history</div><h2>Admissions log</h2><div className="stack" style={{ marginTop: 16 }}>{auditLogs.map(log => <div className="staff-notice" key={log.id}><div><strong>{label(log.action)}</strong><p>{log.createdAt.toLocaleString("en-UG")}{log.metadataJson ? ` · ${log.metadataJson}` : ""}</p></div></div>)}{!auditLogs.length ? <p>No application log entries are available.</p> : null}</div></div>
                <div className="card"><div className="eyebrow">Consultation</div><h2>Contact Admissions if you are not progressing</h2><p>Your message will be sent to <strong>{GITDM.admissionsEmail}</strong> with your application reference so Admissions can follow up.</p><form action={submitAdmissionsConsultation} className="form-grid" style={{ marginTop: 16 }}><input type="hidden" name="applicationId" value={app.id}/><div className="form-row"><label>Subject</label><input name="subject" required placeholder="Application follow-up" /></div><div className="form-row"><label>Message</label><textarea name="message" required minLength={10} rows={6} placeholder="Explain what has not progressed or what you need Admissions to clarify." /></div><button className="btn btn-primary">Send consultation to Admissions</button></form></div>
              </div>
            </div>
          </div></section>
        </main><Footer />
      </>
    );
  }

  const notice = query.submitted
    ? "Application received. Your application file is now with GITDM Admissions."
    : query.payment === "completed"
      ? "Application fee confirmed. Your payment has been receipted and your application is ready for Admissions review."
      : query.payment === "failed"
        ? query.error || "Application fee payment failed. No fee credit was applied."
        : query.payment === "abandoned"
          ? "The payment checkout was abandoned. You can start the application fee payment again."
          : query.appeal === "submitted"
            ? "Your appeal has been received and is now pending Admissions review."
            : null;

  return (
    <>
      <Header active="/admissions" />
      <main>
        <section className="page-hero">
          <div className="container">
            <div className="eyebrow">GITDM admissions · Application {app.id.slice(-8).toUpperCase()}</div>
            <h1>{app.programme.name}</h1>
            <p>{app.status === "ACCEPTED" ? "ADMITTED" : label(app.status)} · {user.email}</p>
          </div>
        </section>

        <section className="section">
          <div className="container">
            {notice ? <div className="access-banner full" style={{ marginBottom: 24 }}><strong>{notice}</strong>{query.reference ? <div style={{ marginTop: 5, fontSize: 13 }}>Pesapal reference: {query.reference}</div> : null}</div> : null}

            <div className="application-steps">
              <div className={`application-step ${app.status !== "DRAFT" ? "done" : "active"}`}><span>01</span><strong>Application</strong><small>Submit your details and documents</small></div>
              <div className={`application-step ${feePaid ? "done" : app.status !== "DRAFT" ? "active" : ""}`}><span>02</span><strong>Application fee</strong><small>{feePaid ? "Paid and receipted" : "UGX " + Number(feeInvoice?.amount || app.programme.applicationFee).toLocaleString()}</small></div>
              <div className={`application-step ${accepted || rejected ? "done" : ""}`}><span>03</span><strong>Admissions</strong><small>Document review and decision</small></div>
              <div className={`application-step ${accepted ? "active" : ""}`}><span>04</span><strong>Student onboarding</strong><small>Tuition, campus and classes</small></div>
            </div>

            <div className="grid grid-2" style={{ alignItems: "start", marginTop: 28 }}>
              <div className="stack">
                <div className="card">
                  <div className="eyebrow">Application file</div>
                  <h2>Complete your admission file</h2>
                  <p>GITDM reviews the identity and education documents you submit. Keep confidential records inside the authenticated application area.</p>
                  <div className="stack" style={{ marginTop: 18 }}>
                    {editable ? (
                    <div className="access-banner full" style={{ marginBottom: 8 }}>
                      <strong>Open application.</strong> No documents are required at this stage. Fill in your details below and submit — Admissions & Registry will review and email you the outcome.
                    </div>
                  ) : (
                    <div className="staff-notice"><div><strong>Submitted details</strong><p>{app.legalName || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}</p></div><span className="badge">On file</span></div>
                  )}
                  </div>
                  {editable ? (
                  <form action={submitApplication} className="form-grid" style={{ marginTop: 18 }}>
                    <input type="hidden" name="applicationId" value={app.id} />
                    <div className="eyebrow">Legal identity</div>
                    <label>Full legal name (exactly as on national ID / passport)
                      <input name="legalName" defaultValue={[user.firstName, user.lastName].filter(Boolean).join(" ")} required placeholder="As printed on your ID" />
                    </label>
                    <div className="grid grid-2">
                      <label>First name<input name="firstName" defaultValue={user.firstName || ""} required /></label>
                      <label>Last name<input name="lastName" defaultValue={user.lastName || ""} required /></label>
                    </div>
                    <div className="grid grid-2">
                      <label>Date of birth<input name="dateOfBirth" type="date" /></label>
                      <label>Gender
                        <select name="gender" defaultValue="">
                          <option value="">Prefer not to say</option>
                          <option value="Female">Female</option>
                          <option value="Male">Male</option>
                          <option value="Other">Other</option>
                        </select>
                      </label>
                    </div>
                    <div className="grid grid-2">
                      <label>Nationality<input name="nationality" defaultValue="Ugandan" required /></label>
                      <label>Phone<input name="phone" defaultValue={user.phone || ""} placeholder="07…" required /></label>
                    </div>
                    <div className="eyebrow" style={{ marginTop: 12 }}>Contact address</div>
                    <label>Street / village / area<input name="address" placeholder="Optional" /></label>
                    <div className="grid grid-2">
                      <label>City / town<input name="city" placeholder="Kampala" /></label>
                      <label>Country<input name="country" defaultValue="Uganda" required /></label>
                    </div>
                    <div className="eyebrow" style={{ marginTop: 12 }}>Background & motivation</div>
                    <label>Education background
                      <textarea name="educationBackground" required minLength={10} rows={3} placeholder="Highest qualification, school or institution, year completed…" />
                    </label>
                    <label>Why do you want to join this programme?
                      <textarea name="motivation" required minLength={20} rows={4} placeholder="Share your goals in financial markets, trading or derivatives…" />
                    </label>
                    <label>How did you hear about GITDM?
                      <input name="howHeard" placeholder="Social media, friend, partner platform…" />
                    </label>
                    <label style={{ fontWeight: 400, display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <input type="checkbox" required /> I confirm the information supplied is accurate and matches my official identity documents.
                    </label>
                    <button className="btn btn-primary" type="submit">Submit application</button>
                    <p className="tile-meta">After you submit, Admissions & Registry receives a branded notification and you receive a confirmation email.</p>
                  </form>
                  ) : app.legalName ? (
                    <div className="stack" style={{ marginTop: 18 }}>
                      <div className="staff-notice"><div><strong>Legal name</strong><p>{app.legalName}</p></div></div>
                      {app.nationality ? <div className="staff-notice"><div><strong>Nationality</strong><p>{app.nationality}</p></div></div> : null}
                      {app.educationBackground ? <div className="staff-notice"><div><strong>Education</strong><p>{app.educationBackground}</p></div></div> : null}
                      {app.motivation ? <div className="staff-notice"><div><strong>Motivation</strong><p>{app.motivation}</p></div></div> : null}
                    </div>
                  ) : null}
                </div>

                {rejected ? <div className="card" style={{ borderColor: "#f1c5cc" }}>
                  <div className="eyebrow">Appeal a decision</div>
                  <h2>Your application was not admitted</h2>
                  <p>{app.decisions[0]?.reason || app.notes || "Admissions recorded a rejection decision."}</p>
                  {app.appealStatus === "PENDING" ? <div className="access-banner" style={{ marginTop: 16 }}><strong>Appeal pending.</strong> Admissions is reviewing the information you submitted.</div> : <form action={submitAdmissionAppeal} className="form-grid" style={{ marginTop: 16 }}>
                    <input type="hidden" name="applicationId" value={app.id} />
                    <div className="form-row"><label>Why should the decision be reconsidered?</label><textarea name="reason" minLength={20} required placeholder="Explain any new information, clarification or evidence you want Admissions to consider." /></div>
                    <button className="btn btn-primary" type="submit">Submit appeal</button>
                  </form>}
                </div> : null}
              </div>

              <div className="stack">
                <div className="panel">
                  <div className="eyebrow">Application fee</div>
                  <h2 style={{ marginTop: 8 }}>{feeInvoice ? money(feeInvoice.amount, feeInvoice.currency) : "No fee"}</h2>
                  <p>Application fee · non-tuition admission processing fee</p>
                  {feeInvoice ? <div className="meta" style={{ marginTop: 14 }}><span className="chip">{feeInvoice.invoiceNo}</span><span className={`chip ${feePaid ? "chip-accent" : "chip-gold"}`}>{feePaid ? "Paid" : "Payment required"}</span></div> : null}{feeInvoice && !feePaid && app.status === "DRAFT" ? <p className="tile-meta" style={{ marginTop: 12 }}>Submit the application first. The payment step unlocks after GITDM receives your application.</p> : null}
                  {feeInvoice && !feePaid && !rejected && app.status !== "DRAFT" ? <form action={payApplicationFee} style={{ marginTop: 18 }}><input type="hidden" name="applicationId" value={app.id} /><button className="btn btn-primary" type="submit">Pay application fee with Pesapal</button><p className="tile-meta" style={{ marginTop: 8 }}>You will be securely redirected to Pesapal to complete the payment.</p></form> : null}
                  {latestReceipt ? <div className="access-banner full" style={{ marginTop: 18 }}><strong>Payment receipted.</strong><div style={{ marginTop: 4 }}>Receipt {latestReceipt.receiptNo}</div></div> : null}
                  {feeInvoice?.payments?.length ? <div style={{ marginTop: 18 }}><strong>Payment activity</strong>{feeInvoice.payments.map((p) => <div className="staff-notice" key={p.id} style={{ marginTop: 8 }}><div><strong>{p.status}</strong><p>{p.createdAt.toLocaleString("en-UG")} · {money(p.amount, p.currency)}</p></div><div className="actions" style={{ margin: 0 }}>{p.status === "PENDING" && p.providerRef ? <form action={refreshApplicationFeePayment}><input type="hidden" name="applicationId" value={app.id}/><input type="hidden" name="paymentId" value={p.id}/><button className="btn btn-outline-dark btn-sm">Check status</button></form> : null}{p.receipt ? <Link href={`/campus/finance/receipts/${p.receipt.id}`} className="btn btn-outline-dark btn-sm">Receipt</Link> : null}</div></div>)}</div> : null}
                </div>

                <div className="card">
                  <div className="eyebrow">Admissions timeline</div>
                  <h2>Where your application is now</h2>
                  <div className="stack" style={{ marginTop: 14 }}>
                    <div className="staff-notice"><div><strong>Application</strong><p>{app.submittedAt ? `Submitted ${app.submittedAt.toLocaleDateString("en-UG")}` : "Draft — not submitted"}</p></div><span className="badge">{app.status === "DRAFT" ? "Draft" : "Received"}</span></div>
                    {app.interviews.map((i) => <div className="staff-notice" key={i.id}><div><strong>Interview {label(i.status)}</strong><p>{i.scheduledAt ? i.scheduledAt.toLocaleString("en-UG") : "Schedule pending"}</p></div></div>)}
                    {app.decisions.map((d) => <div className="staff-notice" key={d.id}><div><strong>{label(d.decision)}</strong><p>{d.reason || "Admissions decision recorded."} · {d.decidedAt.toLocaleDateString("en-UG")}</p></div></div>)}
                    {app.decisions.length === 0 && app.interviews.length === 0 ? <p>No Admissions decision has been recorded yet.</p> : null}
                  </div>
                </div>

                {accepted ? <div className="access-banner full"><strong>Admitted.</strong> Your student onboarding is active. Use the Campus to review tuition, payment and learning access.</div> : null}
              </div>
            </div>

            <div className="actions"><Link href="/admissions" className="btn btn-outline-dark btn-sm">Admissions information</Link><Link href="/campus" className="btn btn-outline-dark btn-sm">Student Campus</Link></div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
