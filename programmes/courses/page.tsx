import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GITDM } from "@/lib/branding";
import { getDb } from "@/lib/db";
import { ACTIVE_COURSE_CODES } from "@/lib/current-catalogue";

export const dynamic = "force-dynamic";
export const metadata = { title: `All Courses | ${GITDM.shortName}`, description: "Explore the complete GITDM course catalogue by delivery duration." };

const images = {
  FFM: "/media/gitdm-course-ffm.jpg",
  FFE: "/media/gitdm-course-ffe.jpg",
};

function CourseCard({ course, publicTitle }: { course: any; publicTitle?: string }) {
  const image = images[course.facultyUnit?.code as keyof typeof images] || images.FFM;
  return <article className="card visual-card">
    <img className="public-image card-image" src={image} alt={`${course.title} course visual`} />
    <div className="card-body">
      <div className="eyebrow">{course.facultyUnit?.code || "GITDM"} · {course.code}</div>
      <h3>{publicTitle || course.title}</h3>
      <p>{publicTitle ? "A complete 12-month GITDM programme covering financial markets, trading and derivatives." : (course.description || `A structured GITDM course in ${course.facultyUnit?.name || "financial markets and professional practice"}.`)}</p>
      <div className="meta"><span className="chip">{course.durationMonths} month{course.durationMonths === 1 ? "" : "s"}</span><span className="chip">{course.durationMonths === 12 ? "Study at your convenience" : `${course.sessionsPerWeek} classes/week`}</span><span className="chip">{course.modules.length} modules</span></div>
      <div className="actions" style={{ marginTop: 18 }}><Link href={`/programmes/courses/${course.id}`} className="btn btn-primary btn-sm">Read course details</Link></div>
    </div>
  </article>;
}

export default async function AllCoursesPage() {
  const db = getDb();
  const courses = db ? await db.course.findMany({
    where: { published: true, studentSelectable: true, catalogueVisible: true, code: { in: [...ACTIVE_COURSE_CODES] } },
    orderBy: [{ durationMonths: "asc" }, { facultyUnit: { name: "asc" } }, { orderIndex: "asc" }, { title: "asc" }],
    include: { facultyUnit: true, modules: { where: { published: true }, select: { id: true } } },
  }) : [];
  const publicCourses = courses.filter(course => !course.code.startsWith("FFM-") || course.code === "FFM-101");
  const groups = [1, 3, 12].map(duration => ({ duration, courses: publicCourses.filter(c => c.durationMonths === duration) })).filter(g => g.courses.length);

  return <>
    <Header active="/programmes" />
    <main>
      <section className="page-hero"><div className="container"><div className="eyebrow">Complete course catalogue</div><h1>Find the course that fits your journey.</h1><p>Explore the current GITDM course catalogue by delivery duration. Open a course to understand what it covers, how often you study, the module pathway and what the learning experience is designed to achieve.</p><div className="actions"><Link href="/programmes" className="btn btn-outline-dark">Back to programmes</Link><Link href="/admissions" className="btn btn-primary">Admissions</Link></div></div></section>
      <section className="section"><div className="container">
        {!groups.length ? <div className="panel"><h2>Course catalogue is being prepared</h2><p>Published courses will appear here as the Academic Directorate makes them available.</p></div> : null}
        {groups.map(group => <section key={group.duration} style={{ marginBottom: 52 }}>
          <div className="eyebrow">{group.duration === 1 ? "1-MONTH COURSES" : group.duration === 3 ? "3-MONTH COURSES" : "12-MONTH COURSES"}</div>
          <h2>{group.duration === 1 ? "Focused intensive learning" : group.duration === 3 ? "Structured professional development" : "Extended academic pathways"}</h2>
          <p className="section-intro">{group.duration === 1 ? "Three scheduled study sessions each week for a concentrated learning cycle." : group.duration === 3 ? "Two scheduled study sessions each week across a deeper three-month delivery cycle." : "A longer academic pathway designed for progressive study, application and professional development."}</p>
          <div className="grid grid-3" style={{ marginTop: 24 }}>{group.courses.map(course => <CourseCard key={course.id} course={course} publicTitle={course.code === "FFM-101" ? "Certificate in Financial Markets, Trading and Derivatives" : undefined} />)}</div>
        </section>)}
      </div></section>
    </main>
    <Footer />
  </>;
}
