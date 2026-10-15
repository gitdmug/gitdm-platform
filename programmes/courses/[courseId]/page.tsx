import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GITDM } from "@/lib/branding";
import { getDb } from "@/lib/db";
import { ACTIVE_COURSE_CODES } from "@/lib/current-catalogue";

export const dynamic = "force-dynamic";

const images = {
  FFM: "/media/gitdm-course-ffm.jpg",
  FFE: "/media/gitdm-course-ffe.jpg",
};

export default async function PublicCourseDetail({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const db = getDb();
  if (!db) notFound();
  const course = await db.course.findFirst({
    where: { id: courseId, code: { in: [...ACTIVE_COURSE_CODES] }, published: true, studentSelectable: true, catalogueVisible: true },
    include: {
      facultyUnit: true,
      programme: true,
      periodLinks: { include: { period: true }, orderBy: { period: { sequence: "asc" } } },
      modules: { where: { published: true }, orderBy: { orderIndex: "asc" }, include: { lessons: { where: { published: true }, orderBy: { orderIndex: "asc" }, select: { id: true, title: true, type: true, durationMinutes: true } } } },
    },
  });
  if (!course) notFound();
  const image = images[course.facultyUnit?.code as keyof typeof images] || images.FFM;
  const months = course.durationMonths;
  const studyPattern = course.durationMonths === 12 ? "Study at your convenience" : course.sessionsPerWeek === 3 ? "3 scheduled study sessions each week" : `${course.sessionsPerWeek} scheduled study sessions each week`;
  const totalLessons = course.modules.reduce((n, m) => n + m.lessons.length, 0);
  const programmeOpen = Boolean(course.programme?.applicationsOpen);

  return <>
    <Header active="/programmes" />
    <main>
      <section className="page-hero"><div className="container"><div className="eyebrow">{course.facultyUnit?.name || "GITDM"} · {course.code}</div><h1>{course.title}</h1><p>{course.description || "A structured GITDM course designed around practical learning, guided study and academic assessment."}</p><div className="meta"><span className="chip">{months} month{months === 1 ? "" : "s"}</span><span className="chip">{studyPattern}</span><span className="chip">{course.modules.length} modules</span><span className="chip">{totalLessons} published lessons</span></div><div className="actions" style={{ marginTop: 22 }}><Link href="/programmes/courses" className="btn btn-outline-dark">All courses</Link>{programmeOpen && course.programme ? <Link href={`/admissions/apply?programmeId=${encodeURIComponent(course.programme.id)}`} className="btn btn-primary">Apply for this programme</Link> : null}</div></div></section>
      <section className="section"><div className="container">
        <div className="grid grid-2" style={{ alignItems: "stretch" }}>
          <div className="card visual-card"><img className="public-image card-image" src={image} alt={`${course.title} visual`} /><div className="card-body"><div className="eyebrow">Course at a glance</div><h2>What you should know</h2><div className="stack"><div className="staff-notice"><strong>Duration</strong><p>{months === 12 ? "A self-directed 12-month pathway with study at your convenience." : `${months} month${months === 1 ? "" : "s"} of structured delivery.`}</p></div><div className="staff-notice"><strong>Study pattern</strong><p>{studyPattern}. This is built into the course delivery plan.</p></div><div className="staff-notice"><strong>Learning pathway</strong><p>{course.modules.length} modules and {totalLessons} currently published lessons in the catalogue.</p></div><div className="staff-notice"><strong>Academic home</strong><p>{course.facultyUnit?.name || "GITDM Academic Faculty"}{course.programme ? ` · ${course.programme.name}` : ""}</p></div></div></div></div>
          <div className="card"><div className="eyebrow">Your learning outcomes</div><h2>What will I learn?</h2><p>Build practical knowledge step by step and learn to make informed decisions using a clear process.</p><ul><li>Analyse the market and understand what price behaviour may indicate.</li><li>Plan trades with defined risk, entries, exits and position sizing where relevant to your course.</li><li>Keep a learning or trading journal, review decisions and identify areas to improve.</li><li>Apply your skills through guided practicals, case studies and hands-on assignments.</li><li>Develop a repeatable, disciplined approach to analysis and decision-making.</li></ul><p>Track your learning journey through completed assessments, achievements and milestones in your student campus.</p><div className="eyebrow" style={{ marginTop: 28 }}>Who is it for?</div><p>This programme is suited to learners who want a firm understanding of financial markets, people looking to apply technical analysis more consistently, and anyone ready to learn through structured practice and assessment.</p></div>
        </div>
      </div></section>
      <section className="section alt"><div className="container"><div className="eyebrow">Course curriculum</div><h2>What will the course cover?</h2><p className="section-intro">The Academic Directorate maintains this module list. Lecturers then build the lessons, resources and scheduled classes inside each approved module.</p><div className="stack" style={{ marginTop: 24 }}>{course.modules.map((module, index) => <article className="card" key={module.id}><div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}><span className="chip chip-accent">Module {index + 1}</span><div style={{ flex: 1 }}><h3>{module.title}</h3><p>{module.description || `A learning stage within ${course.title}.`}</p>{module.lessons.length ? <div className="stack" style={{ marginTop: 14 }}>{module.lessons.map(lesson => <div className="staff-notice" key={lesson.id}><strong>{lesson.title}</strong><p>{lesson.type.replaceAll("_", " ")}{lesson.durationMinutes ? ` · ${lesson.durationMinutes} minutes` : ""}</p></div>)}</div> : <p className="tile-meta">Detailed lessons are being prepared by the academic team.</p>}</div></div></article>)}</div></div></section>
      <section className="section"><div className="container"><div className="grid grid-3"><div className="panel"><div className="eyebrow">Delivery</div><h3>{studyPattern}</h3><p>{months === 12 ? "No fixed timetable is generated for this study-at-your-convenience pathway." : "Three study sessions are delivered each week through GITDM’s academic delivery system. Sessions combine live teaching, practical exercises and time for questions with your lecturer. Your exact timetable, class times and lecturer are published in the student portal before the course begins."}</p></div><div className="panel"><div className="eyebrow">Assessment</div><h3>Learn, practise and demonstrate</h3><p>Each module combines learning, guided practice and formal assessment. Depending on the programme, this may include assignments, quizzes, examinations, case studies and practical work. Feedback helps you identify what you understand well and what to strengthen next.</p></div><div className="panel"><div className="eyebrow">Before you apply</div><h3>Know what you are choosing</h3><p>Review the course duration, module pathway and programme information first. Admissions can then guide you through eligibility, fees and the application process.</p></div></div><div className="actions" style={{ marginTop: 28 }}><Link href="/admissions" className="btn btn-outline-dark">Admissions information</Link><Link href="/contact" className="btn btn-primary">Ask GITDM a question</Link></div></div></section>
    </main>
    <Footer />
  </>;
}
