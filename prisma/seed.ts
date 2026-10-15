import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for seeding.");

const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

const roleDescriptions: Record<string, string> = {
  PRINCIPAL: "Institutional oversight and Control Centre access.",
  ACADEMIC_DIRECTOR: "Academic leadership and academic operations.",
  REGISTRAR: "Academic records, enrolment, transcripts and certificates (Admissions & Registry).",
  FACULTY: "Faculty leadership and academic oversight.",
  LECTURER: "Teaching, learning materials, grading, live classes and attendance.",
  ADMISSIONS: "Applications, admissions decisions, enrolment and onboarding (Admissions & Registry).",
  FINANCE: "Fees, invoices, payment verification and receipts.",
  EXAM_OFFICER: "Examination administration, marking workflow and results.",
  STUDENT_AFFAIRS: "Student support, engagement and student-life matters.",
  LIBRARY: "Library and academic resource management.",
  IT: "Technical support, access and system operations.",
  MARKETING: "Marketing content, campaigns and public communications.",
  PARTNER_SUPPORT: "Partner-platform and related student support.",
  ADMISSIONS_DIRECTOR: "Leads admissions and enrollment operations.", ADMISSIONS_COUNSELOR: "Guides prospective students through applications and interviews.", ONBOARDING_TECH_SUPPORT: "Ensures students are technically ready for online study.", CURRICULUM_DEVELOPER: "Designs digital curriculum, lessons and assessments.", ONLINE_INSTRUCTOR: "Delivers live online teaching, grading and office hours.", DIFFERENTIATED_LEARNING_COORDINATOR: "Coordinates differentiated and accessible learning support.", STUDENT_SUCCESS_COACH: "Monitors engagement, pacing and student success.", ACADEMIC_ADVISOR_REGISTRAR: "Manages academic pathways, records and graduation readiness.", SCHOOL_COUNSELOR: "Provides student counselling and wellbeing support.", CTO_IT_DIRECTOR: "Leads technology, privacy, cybersecurity and integrations.", LMS_ADMINISTRATOR: "Administers the LMS and digital learning operations.", HELPDESK_TECHNICIAN: "Provides day-to-day technical support.", OPERATIONS_COMPLIANCE_MANAGER: "Leads operations, compliance, licensing and audits.", BURSAR_BILLING_SPECIALIST: "Manages tuition, invoices, payment plans and billing.",
  PARENT_GUARDIAN: "Controlled linked-student visibility.",
  ALUMNI: "Post-graduation access and alumni services.",
  STUDENT: "Student academic and campus access.",
};

const departments = [
  "Admissions & Enrollment", "Academic Affairs & Instruction", "Student Success & Support", "Technology & Infrastructure", "Operations & Business Administration",
  "Executive Office", "Academic & Registry", "Student Services", "Finance & Operations", "Partnerships & Growth",
];

const permissionNames: Record<string, string> = {
  "institution.view": "View institutional information",
  "users.assign_roles": "Assign authorized institutional roles",
  "applications.decide": "Record admissions decisions",
  "applications.issue_offer": "Issue admission offers",
  "enrollments.manage": "Create and manage enrolments",
  "finance.reconcile": "Reconcile financial transactions",
  "finance.claims.submit": "Submit staff expense claims",
  "finance.claims.review": "Review departmental expense claims",
  "finance.vendors.manage": "Manage vendor invoices",
  "finance.aid.manage": "Review student financial aid",
  "finance.budget.approve": "Approve budgets and high-value requisitions",
  "finance.payroll.view": "View personal payroll history",
  "finance.payroll.manage": "Manage payroll records",
  "attendance.view": "View attendance",
  "results.moderate": "Moderate results",
  "results.correct": "Correct published results through workflow",
  "institution.manage": "Manage institution settings",
  "users.view": "View users",
  "users.manage": "Manage users",
  "roles.view": "View roles",
  "roles.manage": "Manage roles and permissions",
  "applications.view": "View applications",
  "applications.review": "Review applications",
  "applications.manage": "Manage application workflow",
  "students.view": "View permitted student records",
  "students.manage": "Manage permitted student records",
  "academic.view": "View academic records",
  "academic.manage": "Manage academic operations",
  "programmes.view": "View programmes",
  "programmes.manage": "Create and manage programmes",
  "courses.view": "View courses",
  "courses.manage": "Create and manage courses",
  "lessons.manage": "Create and manage lessons",
  "assignments.manage": "Create and manage assignments",
  "assignments.grade": "Grade assignments",
  "quizzes.manage": "Create and manage quizzes",
  "exams.manage": "Create and manage examinations",
  "exams.mark": "Mark examinations",
  "results.publish": "Publish results",
  "certificates.view": "View certificates",
  "certificates.manage": "Manage certificates",
  "transcripts.view": "View transcripts",
  "attendance.manage": "Manage attendance",
  "finance.view": "View financial records",
  "finance.manage": "Manage financial records",
  "payments.verify": "Verify payments",
  "marketing.view": "View marketing operations",
  "marketing.manage": "Manage marketing operations",
  "partners.view": "View partners",
  "partners.manage": "Manage partners",
  "support.view": "View support cases",
  "support.create": "Create support cases",
  "support.manage": "Manage support cases",
  "library.manage": "Manage library resources",
  "student-affairs.manage": "Manage student affairs",
  "it.manage": "Manage IT operations",
  "audit.view": "View audit logs",
  "reports.view": "View reports",
};

const rolePermissionKeys: Record<string, string[]> = {
  PRINCIPAL: ["finance.payroll.view","finance.budget.approve","institution.view","users.view","users.assign_roles","roles.view","applications.view","applications.decide","applications.issue_offer","enrollments.manage","students.view","academic.view","programmes.view","programmes.manage","courses.view","courses.manage","transcripts.view","certificates.view","finance.view","marketing.view","partners.view","support.view","audit.view","reports.view"],
  ACADEMIC_DIRECTOR: ["finance.payroll.view","finance.claims.submit","academic.view","academic.manage","programmes.view","programmes.manage","courses.view","courses.manage","lessons.manage","assignments.manage","assignments.grade","quizzes.manage","exams.manage","exams.mark","results.publish","certificates.view","certificates.manage","transcripts.view","attendance.manage","students.view","reports.view"],
  REGISTRAR: ["finance.payroll.view","finance.claims.submit","results.moderate","students.view","students.manage","academic.view","transcripts.view","certificates.view","certificates.manage","programmes.view","courses.view","reports.view"],
  FACULTY: ["finance.payroll.view","students.view","academic.view","courses.view","courses.manage","academic.manage","reports.view"],
  LECTURER: ["finance.payroll.view","students.view","academic.view","courses.view","lessons.manage","assignments.manage","assignments.grade","quizzes.manage","exams.manage","exams.mark","attendance.manage","finance.claims.submit"],
  ADMISSIONS: ["finance.payroll.view","finance.claims.submit","applications.view","applications.review","applications.manage","students.view","students.manage","reports.view"],
  FINANCE: ["finance.payroll.view","finance.view","finance.manage","payments.verify","finance.reconcile","finance.claims.review","finance.vendors.manage","finance.aid.manage","finance.payroll.manage","students.view","reports.view"],
  EXAM_OFFICER: ["finance.payroll.view","finance.claims.submit","students.view","academic.view","exams.manage","exams.mark","results.publish","attendance.manage","reports.view"],
  STUDENT_AFFAIRS: ["finance.payroll.view","finance.claims.submit","students.view","support.view","support.create","support.manage","student-affairs.manage","reports.view"],
  LIBRARY: ["finance.payroll.view","finance.claims.submit","students.view","library.manage"],
  IT: ["finance.payroll.view","finance.claims.submit","users.view","support.view","support.manage","it.manage","audit.view"],
  MARKETING: ["finance.payroll.view","finance.claims.submit","marketing.view","marketing.manage","partners.view","reports.view"],
  PARTNER_SUPPORT: ["finance.payroll.view","finance.claims.submit","students.view","support.view","support.manage","partners.view"],
  ADMISSIONS_DIRECTOR: ["finance.payroll.view","applications.view","applications.review","applications.manage","students.view","students.manage","reports.view"],
  ADMISSIONS_COUNSELOR: ["finance.payroll.view","applications.view","applications.review","support.view","students.view"],
  ONBOARDING_TECH_SUPPORT: ["finance.payroll.view","applications.view","students.view","support.view","support.manage","it.manage"],
  CURRICULUM_DEVELOPER: ["finance.payroll.view","academic.view","academic.manage","courses.view","courses.manage","lessons.manage","assignments.manage","quizzes.manage"],
  ONLINE_INSTRUCTOR: ["finance.payroll.view","students.view","academic.view","courses.view","lessons.manage","assignments.manage","assignments.grade","quizzes.manage","attendance.manage"],
  DIFFERENTIATED_LEARNING_COORDINATOR: ["finance.payroll.view","students.view","academic.view","courses.view","support.view"],
  STUDENT_SUCCESS_COACH: ["finance.payroll.view","students.view","academic.view","support.view","support.manage"],
  ACADEMIC_ADVISOR_REGISTRAR: ["finance.payroll.view","students.view","students.manage","academic.view","transcripts.view","certificates.view","programmes.view","courses.view"],
  SCHOOL_COUNSELOR: ["finance.payroll.view","students.view","support.view","support.create","support.manage"],
  CTO_IT_DIRECTOR: ["finance.payroll.view","users.view","support.view","support.manage","it.manage","audit.view"],
  LMS_ADMINISTRATOR: ["finance.payroll.view","users.view","students.view","academic.view","courses.view","courses.manage","lessons.manage","it.manage","reports.view"],
  HELPDESK_TECHNICIAN: ["finance.payroll.view","users.view","support.view","support.manage","it.manage"],
  OPERATIONS_COMPLIANCE_MANAGER: ["finance.payroll.view","institution.view","users.view","audit.view","reports.view","finance.view"],
  BURSAR_BILLING_SPECIALIST: ["finance.payroll.view","finance.view","finance.manage","payments.verify","finance.reconcile","students.view","reports.view"],
  PARENT_GUARDIAN: ["support.view","support.create"],
  ALUMNI: ["transcripts.view","certificates.view"],
  STUDENT: ["courses.view","academic.view","transcripts.view","certificates.view","support.view","support.create"],
};

async function main() {
  for (const name of departments) await db.department.upsert({ where: { name }, update: {}, create: { name } });

  const permissions = new Map<string, { id: string }>();
  for (const [key, name] of Object.entries(permissionNames)) {
    permissions.set(key, await db.permission.upsert({ where: { key }, update: { name }, create: { key, name } }));
  }

  const roles = new Map<string, { id: string }>();
  const activeOperationalRoles = new Set(["PRINCIPAL","ADMISSIONS","CURRICULUM_DEVELOPER","ONLINE_INSTRUCTOR","EXAM_OFFICER","ACADEMIC_ADVISOR_REGISTRAR","STUDENT_SUCCESS_COACH","SCHOOL_COUNSELOR","CTO_IT_DIRECTOR","LMS_ADMINISTRATOR","HELPDESK_TECHNICIAN","OPERATIONS_COMPLIANCE_MANAGER","FINANCE","MARKETING","PARENT_GUARDIAN","ALUMNI"]);

  for (const [code, description] of Object.entries(roleDescriptions)) {
    const role = await db.role.upsert({ where: { code: code as any }, update: { description, isActive: activeOperationalRoles.has(code) }, create: { code: code as any, name: code.replaceAll("_", " "), description, isActive: activeOperationalRoles.has(code) } });
    roles.set(code, role);
  }

  const roleDepartments: Record<string, string> = { PRINCIPAL:"Academic Affairs & Instruction", ACADEMIC_DIRECTOR:"Academic Affairs & Instruction", REGISTRAR:"Student Success & Support", FACULTY:"Academic Affairs & Instruction", LECTURER:"Academic Affairs & Instruction", ADMISSIONS:"Admissions & Enrollment", FINANCE:"Operations & Business Administration", EXAM_OFFICER:"Academic Affairs & Instruction", STUDENT_AFFAIRS:"Student Success & Support", LIBRARY:"Academic Affairs & Instruction", IT:"Technology & Infrastructure", MARKETING:"Admissions & Enrollment", PARTNER_SUPPORT:"Student Success & Support", ADMISSIONS_DIRECTOR:"Admissions & Enrollment", ADMISSIONS_COUNSELOR:"Admissions & Enrollment", ONBOARDING_TECH_SUPPORT:"Admissions & Enrollment", CURRICULUM_DEVELOPER:"Academic Affairs & Instruction", ONLINE_INSTRUCTOR:"Academic Affairs & Instruction", DIFFERENTIATED_LEARNING_COORDINATOR:"Academic Affairs & Instruction", STUDENT_SUCCESS_COACH:"Student Success & Support", ACADEMIC_ADVISOR_REGISTRAR:"Student Success & Support", SCHOOL_COUNSELOR:"Student Success & Support", CTO_IT_DIRECTOR:"Technology & Infrastructure", LMS_ADMINISTRATOR:"Technology & Infrastructure", HELPDESK_TECHNICIAN:"Technology & Infrastructure", OPERATIONS_COMPLIANCE_MANAGER:"Operations & Business Administration", BURSAR_BILLING_SPECIALIST:"Operations & Business Administration", PARENT_GUARDIAN:"Student Success & Support", ALUMNI:"Student Success & Support", STUDENT:"Student Success & Support" };
  for (const [code, departmentName] of Object.entries(roleDepartments)) { const role = roles.get(code); const department = await db.department.findUnique({ where: { name: departmentName } }); if (role && department) await db.role.update({ where: { id: role.id }, data: { departmentId: department.id } }); }

  // STUDENT remains only as a legacy database enum/role for backward compatibility; it is not active or assignable. Learner access is derived from enrolment and financial state.

  // GITDM academic faculties. These are stable catalog units; courses can be
  // created independently of a programme and later allocated to a lecturer/cohort.
  const financialMarketsFaculty = await db.faculty.upsert({
    where: { code: "FFM" },
    update: { name: "Faculty of Financial Markets", description: "Training professional traders in financial markets, trading, technical analysis, risk management and market practice." },
    create: { code: "FFM", name: "Faculty of Financial Markets", description: "Training professional traders in financial markets, trading, technical analysis, risk management and market practice." },
  });

  for (const [code, keys] of Object.entries(rolePermissionKeys)) {
    for (const key of keys) {
      const role = roles.get(code)!;
      const permission = permissions.get(key)!;
      await db.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } }, update: {}, create: { roleId: role.id, permissionId: permission.id } });
    }
  }

  const programme = await db.programme.upsert({
    where: { code: "GITDM-CFMTD" },
    update: { applicationsOpen: true, status: "PUBLISHED", intakeLabel: "2026 intake · 3 trimesters · 100% online" },
    create: {
      code: "GITDM-CFMTD",
      name: "Certificate in Financial Markets, Trading and Derivatives",
      shortName: "CFMTD",
      description: "A structured GITDM programme covering financial markets, trading and derivatives.",
      durationMonths: 12,
      status: "PUBLISHED",
      applicationFee: 10000,
      currency: "UGX",
      applicationsOpen: true,
      nextStartDate: new Date("2026-11-02T00:00:00+03:00"),
      intakeLabel: "2026 intake · 3 trimesters · 100% online",
      rules: {
        create: {
          minimumEducation: "Secondary education / Uganda S4 equivalent",
          passMarkPercent: 50,
          attendanceMinimumPercent: 70,
          assignmentWeightPercent: 30,
          quizWeightPercent: 20,
          examWeightPercent: 50,
          examAttemptsAllowed: 3,
          activationPaymentPercent: 60,
          examPaymentClearancePercent: 100,
          allowsCourseRepeat: true,
          academicTeamDecidesResit: true,
          certificateMaxMonths: 2,
          requiresIdentityDocument: true,
          requiresEducationDocument: true,
          interviewByAdmissions: true,
        },
      },
    },
  });

  for (const [sequence, name] of [[1, "Trimester 1"], [2, "Trimester 2"], [3, "Trimester 3"]] as const) {
    await db.academicPeriod.upsert({
      where: { programmeId_sequence: { programmeId: programme.id, sequence } },
      // Preserve an administrator's existing period status on redeploy.
      update: { feeAmount: 600000 },
      create: {
        programmeId: programme.id,
        name,
        sequence,
        feeAmount: 600000,
        currency: "UGX",
        status: sequence === 1 ? "OPEN" : "PLANNED",
      },
    });
  }

  // Existing installations may have been seeded before the first period was
  // given an OPEN status. Ensure there is one billable period without closing
  // or changing any period that Finance has already configured.
  const openPeriod = await db.academicPeriod.findFirst({
    where: { programmeId: programme.id, status: "OPEN" },
    select: { id: true },
  });
  if (!openPeriod) {
    const firstPeriod = await db.academicPeriod.findFirst({
      where: { programmeId: programme.id, status: "PLANNED" },
      orderBy: { sequence: "asc" },
      select: { id: true },
    });
    if (firstPeriod) {
      await db.academicPeriod.update({ where: { id: firstPeriod.id }, data: { status: "OPEN" } });
    }
  }

  // October 2026 intake: only the two short programmes below are open for application.
  // Classes for both programmes begin on 2 November 2026.
  const octoberStart = new Date("2026-11-02T00:00:00+03:00");
  const shortProgrammes = [
    {
      code: "GITDM-TA1M",
      name: "Certificate in Technical Analysis",
      shortName: "Technical Analysis — 1 Month",
      description: "An intensive one-month programme focused on market structure, support and resistance, trend analysis, supply and demand, break-and-retest logic, trade planning and risk management.",
      durationMonths: 1,
      fee: 400000,
      courses: [["TA101", "Technical Analysis Foundations"]] as const,
    },
    {
      code: "GITDM-FX3M",
      name: "Certificate in Beginner Forex Trading",
      shortName: "Beginner Forex — 3 Months",
      description: "A structured three-month entry programme covering forex market foundations, technical analysis, risk management, trade execution, journaling and practical trading discipline.",
      durationMonths: 3,
      fee: 600000,
      courses: [["FX3M", "Certificate in Beginner Forex Trading"]] as const,
    },
  ] as const;

  for (const item of shortProgrammes) {
    const shortProgramme = await db.programme.upsert({
      where: { code: item.code },
      update: {
        name: item.name, shortName: item.shortName, description: item.description, durationMonths: item.durationMonths,
        applicationFee: 10000, currency: "UGX", status: "PUBLISHED", requiresApplication: true, requiresAdmission: true,
        applicationsOpen: true, nextStartDate: octoberStart, intakeLabel: "October 2026 intake · Classes start 2 November 2026",
      },
      create: {
        code: item.code, name: item.name, shortName: item.shortName, description: item.description, durationMonths: item.durationMonths,
        applicationFee: 10000, currency: "UGX", status: "PUBLISHED", requiresApplication: true, requiresAdmission: true,
        applicationsOpen: true, nextStartDate: octoberStart, intakeLabel: "October 2026 intake · Classes start 2 November 2026",
        rules: { create: { minimumEducation: "Secondary education / Uganda S4 equivalent", requiresIdentityDocument: true, requiresEducationDocument: true, interviewByAdmissions: true, assignmentWeightPercent: 30, quizWeightPercent: 20, examWeightPercent: 50 } },
      },
    });

    const period = await db.academicPeriod.upsert({
      where: { programmeId_sequence: { programmeId: shortProgramme.id, sequence: 1 } },
      update: { name: item.durationMonths === 1 ? "1 Month Programme" : "3 Month Programme", feeAmount: item.fee, currency: "UGX", status: "OPEN", startsAt: octoberStart },
      create: { programmeId: shortProgramme.id, name: item.durationMonths === 1 ? "1 Month Programme" : "3 Month Programme", sequence: 1, feeAmount: item.fee, currency: "UGX", status: "OPEN", startsAt: octoberStart },
    });

    for (const [index, [code, title]] of item.courses.entries()) {
      const course = await db.course.upsert({
        where: { code },
        update: { title, published: true, description: `${shortProgramme.name} — ${title}.`, facultyId: financialMarketsFaculty.id },
        create: { programmeId: shortProgramme.id, facultyId: financialMarketsFaculty.id, code, title, description: `${shortProgramme.name} — ${title}.`, orderIndex: index + 1, published: true },
      });
      await db.periodCourse.upsert({ where: { periodId_courseId: { periodId: period.id, courseId: course.id } }, update: {}, create: { periodId: period.id, courseId: course.id, required: true } });
      const module = await db.courseModule.findFirst({ where: { courseId: course.id, title: "Core Module 1" } });
      const m = module ?? await db.courseModule.create({ data: { courseId: course.id, title: "Core Module 1", description: "Core learning pathway", orderIndex: 1, published: true } });
      const lesson = await db.lesson.findFirst({ where: { moduleId: m.id, title: "Orientation & Learning Outcomes" } });
      if (!lesson) await db.lesson.create({ data: { moduleId: m.id, title: "Orientation & Learning Outcomes", type: "ARTICLE", content: `Welcome to ${title}. Review the learning outcomes, complete the lesson, then continue to assessments.`, orderIndex: 1, required: true, published: true } });
      const curriculum: Record<string, {module:string, lessons:string[]}[]> = {
        TA101: [
          {module:"Market Foundations",lessons:["How financial markets move","Price, liquidity and volatility","Reading a clean price chart"]},
          {module:"Technical Analysis Framework",lessons:["Support and resistance","Trendlines and market structure","Supply and demand zones","Break, retest and continuation"]},
          {module:"Trade Planning",lessons:["Entry, stop-loss and target planning","Risk-to-reward and position sizing","Building a repeatable trade plan"]},
          {module:"Practical Analysis",lessons:["Top-down chart analysis","Trade case study and breakdown","Trading journal and review"]}
        ],
        FX3M: [
          {module:"Forex Market Foundations",lessons:["What forex is and how the market works","Currency pairs, pips and spreads","Lots, leverage and margin","Trading sessions and liquidity"]},
          {module:"Market Drivers",lessons:["Interest rates and central banks","Inflation, employment and major releases","DXY, yields and risk sentiment","Building a weekly fundamental watchlist"]},
          {module:"Responsible Trading",lessons:["Risk before reward","Leverage and account protection","Common beginner mistakes","Trading plan and discipline"]},
          {module:"Technical Analysis Foundations",lessons:["Market structure and trend","Support and resistance","Trendlines and channels","Supply and demand"]},
          {module:"Trade Setups",lessons:["Break and retest continuation","Pushback into a zone","Confluence without indicator dependence","Entry confirmation"]},
          {module:"Trade Planning Lab",lessons:["Pre-trade checklist","Chart case studies","Backtesting and review","Writing a complete trade plan"]},
          {module:"Risk Management",lessons:["Position sizing","Stop-loss placement","Risk per trade and daily limits","Drawdown control"]},
          {module:"Execution Practice",lessons:["Order execution and trade management","Managing open positions","When not to trade","News and volatility management"]},
          {module:"Professional Practice",lessons:["Trading journal","20-day trade review","Performance metrics","Final practical trading plan"]}
        ]
      };
      const curriculumRows = curriculum[code] || [];
      for (const [mi, row] of curriculumRows.entries()) {
        const existingModule = await db.courseModule.findFirst({where:{courseId:course.id,title:row.module}});
        const mod = existingModule ? await db.courseModule.update({where:{id:existingModule.id},data:{description:`${title} — ${row.module}`,orderIndex:mi+2,published:true}}) : await db.courseModule.create({data:{courseId:course.id,title:row.module,description:`${title} — ${row.module}`,orderIndex:mi+2,published:true}});
        for (const [li, lessonTitle] of row.lessons.entries()) {
          const existingLesson = await db.lesson.findFirst({where:{moduleId:mod.id,title:lessonTitle}});
          if(existingLesson) await db.lesson.update({where:{id:existingLesson.id},data:{orderIndex:li+1,published:true,required:true}});
          else await db.lesson.create({data:{moduleId:mod.id,title:lessonTitle,type:"ARTICLE",content:`${lessonTitle} — structured GITDM learning lesson. Faculty should enrich this lesson with approved notes, examples and class resources before delivery.`,orderIndex:li+1,required:true,published:true}});
        }
      }
    }
  }

  // Uganda public holidays used by the automatic timetable generator.
  // Dates that depend on official religious announcements can be added/updated in the Control Centre.
  const publicHolidays = [
    ["2026-12-25", "Christmas Day"], ["2026-12-26", "Boxing Day"],
    ["2027-01-01", "New Year's Day"], ["2027-01-26", "Liberation Day"],
    ["2027-02-16", "Archbishop Janani Luwum Day"], ["2027-03-08", "International Women's Day"],
    ["2027-05-01", "Labour Day"], ["2027-06-03", "Uganda Martyrs' Day"], ["2027-06-09", "National Heroes' Day"], ["2027-10-09", "Independence Day"], ["2027-12-25", "Christmas Day"], ["2027-12-26", "Boxing Day"],
  ] as const;
  for (const [date, name] of publicHolidays) {
    await db.academicHoliday.upsert({ where: { date: new Date(`${date}T00:00:00.000Z`) }, update: { name, countryCode: "UG", source: "Uganda public holiday calendar", isObserved: true }, create: { date: new Date(`${date}T00:00:00.000Z`), name, countryCode: "UG", source: "Uganda public holiday calendar", isObserved: true } });
  }

  // Public-source academic catalogue: keep only the current financial-markets
  // faculty and the course units required by the three current intake programmes. The Certificate is
  // represented as the identified 15-course pathway (5 courses per trimester).
  const facultyCourses = [
    [financialMarketsFaculty.id, "FFM-101", "Certificate in Financial Markets, Trading and Derivatives", "The 12-month flagship programme covering financial markets, trading, derivatives, risk and applied market research."],
    [financialMarketsFaculty.id, "FFM-102", "Global Financial System", "How global financial systems operate and connect markets."],
    [financialMarketsFaculty.id, "FFM-103", "Market Participants and Institutions", "Key market participants, institutions and their roles."],
    [financialMarketsFaculty.id, "FFM-104", "Financial Instruments", "Equities, Forex and derivatives as core financial instruments."],
    [financialMarketsFaculty.id, "FFM-105", "Introduction to Trading Principles", "Foundational principles for participating in financial markets."],
    [financialMarketsFaculty.id, "FFM-106", "Advanced Technical Analysis", "Advanced technical analysis tools for market interpretation."],
    [financialMarketsFaculty.id, "FFM-107", "Market Structure and Price Action", "Market structure and price-action analysis for trading decisions."],
    [financialMarketsFaculty.id, "FFM-108", "Fundamental Analysis and Macroeconomics", "Fundamental analysis and macroeconomic drivers of markets."],
    [financialMarketsFaculty.id, "FFM-109", "Trade Planning and Execution", "Structured trade planning and practical execution."],
    [financialMarketsFaculty.id, "FFM-110", "Introduction to Derivatives Markets", "Foundations of derivatives markets and their applications."],
    [financialMarketsFaculty.id, "FFM-111", "Advanced Trading Strategies", "Advanced strategy development for professional market participation."],
    [financialMarketsFaculty.id, "FFM-112", "Derivatives and Hedging Techniques", "Derivatives and hedging techniques for managing market exposure."],
    [financialMarketsFaculty.id, "FFM-113", "Portfolio Construction and Management", "Portfolio construction, management and investment principles."],
    [financialMarketsFaculty.id, "FFM-114", "Market Research and Strategy Development", "Market research and development of structured market strategies."],
    [financialMarketsFaculty.id, "FFM-115", "Final Capstone Project", "Final applied project for the Certificate in Financial Markets, Trading and Derivatives; integrates the programme's financial-market learning and serves as the final FFM-115 course."],
  ] as const;

  for (const [index, [facultyId, code, title, description]] of facultyCourses.entries()) {
    const flagship = code.startsWith("FFM-");
    const course = await db.course.upsert({
      where: { code },
      update: { facultyId, title, description, published: true, studentSelectable: true, orderIndex: index + 1, ...(flagship ? { programmeId: programme.id, durationMonths: 12, sessionsPerWeek: 2 } : {}) },
      create: { facultyId, code, title, description, orderIndex: index + 1, published: true, studentSelectable: true, ...(flagship ? { programmeId: programme.id, durationMonths: 12, sessionsPerWeek: 2 } : {}) },
    });
    const module = await db.courseModule.findFirst({ where: { courseId: course.id, title: "Core Learning Module" } });
    const m = module ?? await db.courseModule.create({ data: { courseId: course.id, title: "Core Learning Module", description: "Public-source course learning pathway", orderIndex: 1, published: true } });
    const lesson = await db.lesson.findFirst({ where: { moduleId: m.id, title: "Course Orientation" } });
    if (!lesson) await db.lesson.create({ data: { moduleId: m.id, title: "Course Orientation", type: "ARTICLE", content: `Welcome to ${title}. This course is aligned with GITDM's published academic catalogue.`, orderIndex: 1, required: true, published: true } });
  }

  // The 12-month flagship pathway is delivered as five courses per trimester.
  // Keep these links in the seed as well as the deployment sync so both setup
  // paths produce the same internal academic structure.
  const flagshipPeriods = await db.academicPeriod.findMany({ where: { programmeId: programme.id }, orderBy: { sequence: "asc" }, select: { id: true, sequence: true } });
  const flagshipCourses = await db.course.findMany({ where: { programmeId: programme.id, code: { startsWith: "FFM-" } }, orderBy: { code: "asc" }, select: { id: true, code: true } });
  for (const [index, course] of flagshipCourses.entries()) {
    const period = flagshipPeriods[Math.floor(index / 5)];
    if (period) await db.periodCourse.upsert({ where: { periodId_courseId: { periodId: period.id, courseId: course.id } }, update: { required: true }, create: { periodId: period.id, courseId: course.id, required: true } });
  }

  // Normalise only the active current-intake course catalogue into the three delivery bands. These are
  // catalogue properties, so a course remains consistently classified wherever
  // it is shown (programme builder, lecturer workspace, student learning and
  // public catalogue). Existing records are updated in place; nothing is deleted.
  const oneMonthCodes = new Set(["TA101"]);
  const threeMonthCodes = new Set(["FX3M"]);
  const twelveMonthCodes = new Set(["FFM-101", "FFM-102", "FFM-103", "FFM-104", "FFM-105", "FFM-106", "FFM-107", "FFM-108", "FFM-109", "FFM-110", "FFM-111", "FFM-112", "FFM-113", "FFM-114", "FFM-115"]);

  const moduleTemplates: Record<1 | 3 | 12, string[]> = {
    1: ["Foundations & Orientation", "Core Concepts", "Practical Application", "Assessment & Review"],
    3: ["Foundations & Market Context", "Core Concepts & Frameworks", "Tools & Methods", "Guided Practical Work", "Strategy & Decision Making", "Assessment & Applied Review"],
    12: ["Academic Orientation & Market Foundations", "Financial Markets & Global Systems", "Market Participants & Instruments", "Trading Principles & Market Structure", "Technical Analysis & Price Action", "Fundamental Analysis & Macroeconomics", "Trade Planning & Execution", "Derivatives & Hedging", "Advanced Trading Strategies", "Portfolio & Risk Management", "Research & Strategy Development", "Capstone, Professional Practice & Review"],
  };

  const activeCatalogueCodes = new Set(["TA101", "FX3M", ...twelveMonthCodes]);
  const allCatalogueCourses = await db.course.findMany({ select: { id: true, code: true, title: true, programmeId: true } });
  for (const existing of allCatalogueCourses) {
    if (!activeCatalogueCodes.has(existing.code)) {
      await db.course.update({ where: { id: existing.id }, data: { catalogueVisible: false, published: false, studentSelectable: false } });
      continue;
    }
    const linkedProgramme = existing.programmeId ? await db.programme.findUnique({ where: { id: existing.programmeId }, select: { durationMonths: true } }) : null;
    const linkedDuration = linkedProgramme?.durationMonths === 1 || linkedProgramme?.durationMonths === 3 || linkedProgramme?.durationMonths === 12 ? linkedProgramme.durationMonths : undefined;
    const durationMonths: 1 | 3 | 12 = linkedDuration ?? (oneMonthCodes.has(existing.code) ? 1 : threeMonthCodes.has(existing.code) ? 3 : twelveMonthCodes.has(existing.code) ? 12 : 1);
    const sessionsPerWeek = durationMonths === 12 ? 0 : durationMonths === 1 ? 3 : 2;
    await db.course.update({ where: { id: existing.id }, data: { durationMonths, sessionsPerWeek, catalogueVisible: true, published: true, studentSelectable: true } });

    // Give every catalogue course a usable starting curriculum. Existing modules
    // and lessons are preserved; missing template modules are added around them.
    const existingModules = await db.courseModule.findMany({ where: { courseId: existing.id }, select: { title: true, orderIndex: true } });
    const existingTitles = new Set(existingModules.map(m => m.title.trim().toLowerCase()));
    let nextOrder = existingModules.reduce((max, m) => Math.max(max, m.orderIndex), 0);
    for (const templateTitle of moduleTemplates[durationMonths]) {
      if (existingTitles.has(templateTitle.toLowerCase())) continue;
      nextOrder += 1;
      const module = await db.courseModule.create({
        data: {
          courseId: existing.id,
          title: templateTitle,
          description: `${existing.title} — ${templateTitle}. Academic Director may edit this module before delivery.`,
          orderIndex: nextOrder,
          published: true,
          approvalStatus: "APPROVED",
        },
      });
      await db.lesson.create({
        data: {
          moduleId: module.id,
          title: `${templateTitle} — Course lesson`,
          type: "ARTICLE",
          content: `Starter lesson for ${existing.title}. The Academic Director or assigned lecturer should replace or expand this content with the approved teaching material.`,
          orderIndex: 1,
          required: true,
          published: true,
        },
      });
    }
  }

  // The 12-month certificate owns the FFM/FFE long-form catalogue. Keep the
  // existing course IDs/records and simply attach them to the programme so they
  // become visible in the programme builder and public catalogue.
  for (const code of [...twelveMonthCodes]) {
    const course = await db.course.findUnique({ where: { code }, select: { id: true, programmeId: true } });
    if (course && !course.programmeId) await db.course.update({ where: { id: course.id }, data: { programmeId: programme.id } });
  }

  // Link the 15 public-source Certificate courses to the three Certificate trimesters.
  const certificatePeriods = await db.academicPeriod.findMany({
    where: { programmeId: programme.id },
    orderBy: { sequence: "asc" },
    select: { id: true, sequence: true },
  });
  const certificateCourseCodes = [
    ["FFM-101", "FFM-102", "FFM-103", "FFM-104", "FFM-105"],
    ["FFM-106", "FFM-107", "FFM-108", "FFM-109", "FFM-110"],
    ["FFM-111", "FFM-112", "FFM-113", "FFM-114", "FFM-115"],
  ] as const;
  for (const period of certificatePeriods) {
    const codes = certificateCourseCodes[period.sequence - 1] || [];
    for (const code of codes) {
      const course = await db.course.findUnique({ where: { code }, select: { id: true } });
      if (course) {
        await db.periodCourse.upsert({
          where: { periodId_courseId: { periodId: period.id, courseId: course.id } },
          update: { required: true },
          create: { periodId: period.id, courseId: course.id, required: true },
        });
      }
    }
  }

  await db.partner.upsert({
    where: { id: "pepperstone-industry-partner" },
    update: { name: "Pepperstone", type: "INDUSTRY", status: "ACTIVE", logoUrl: "https://pepperstone.com/favicon.ico", websiteUrl: "https://pepperstone.com/en/create-account", description: "Software provider and industry partner." },
    create: { id: "pepperstone-industry-partner", name: "Pepperstone", type: "INDUSTRY", status: "ACTIVE", logoUrl: "https://pepperstone.com/favicon.ico", websiteUrl: "https://pepperstone.com/en/create-account", description: "Software provider and industry partner." },
  });

  await db.partner.upsert({
    where: { id: "smari-education-partner" },
    update: { name: "SMARI Skilling Institute", type: "EDUCATION", status: "ACTIVE", logoUrl: "https://smari.ac.ug/favicon.ico", websiteUrl: "https://smari.ac.ug/", description: "Education and academic partner." },
    create: { id: "smari-education-partner", name: "SMARI Skilling Institute", type: "EDUCATION", status: "ACTIVE", logoUrl: "https://smari.ac.ug/favicon.ico", websiteUrl: "https://smari.ac.ug/", description: "Education and academic partner." },
  });

const publicProducts = [
  ["GITDM Market Basics — Free Guide", 0, 0, "DIGITAL"],
  ["GITDM Financial Markets Handbook", 25000, 100, "BOTH"],
  ["GITDM Trading & Derivatives Handbook", 35000, 100, "BOTH"],
] as const;
for (const [name, price, stock, fulfillment] of publicProducts) {
  const id = `public-${name.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`;
  await db.storeProduct.upsert({
    where: { id },
    update: { price, stock, status: price === 0 || stock ? "ACTIVE" : "SOLD_OUT", audience: "PUBLIC", fulfillment, onlineReadable: price === 0 || name.includes("Financial Markets") || name.includes("Trading & Derivatives"), digitalUrl: name.includes("Financial Markets") ? "gitdmbook:financial-markets-handbook.pdf" : name.includes("Trading & Derivatives") ? "gitdmbook:trading-derivatives-handbook.pdf" : undefined, imageUrl: name.includes("Free") ? "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=1000&q=85" : name.includes("Financial Markets") ? "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=1000&q=85" : "https://images.unsplash.com/photo-1589998059171-988d887df646?auto=format&fit=crop&w=1000&q=85", description: price === 0 ? "Free GITDM introductory learning guide." : "Official GITDM handbook for learners and financial-market professionals." },
    create: { id, name, price, currency: "UGX", stock, status: "ACTIVE", audience: "PUBLIC", fulfillment, onlineReadable: price === 0 || name.includes("Financial Markets") || name.includes("Trading & Derivatives"), digitalUrl: name.includes("Financial Markets") ? "gitdmbook:financial-markets-handbook.pdf" : name.includes("Trading & Derivatives") ? "gitdmbook:trading-derivatives-handbook.pdf" : undefined, imageUrl: name.includes("Free") ? "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=1000&q=85" : name.includes("Financial Markets") ? "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=1000&q=85" : "https://images.unsplash.com/photo-1589998059171-988d887df646?auto=format&fit=crop&w=1000&q=85", description: price === 0 ? "Free GITDM introductory learning guide." : "Official GITDM handbook for learners and financial-market professionals." },
  });
}


  console.log("GITDM foundation seed complete.");
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => db.$disconnect());
