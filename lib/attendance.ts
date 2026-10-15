/**
 * Live class attendance with Google Meet integration.
 *
 * Flow:
 * 1. Staff schedules TimetableEvent (course, cohort, lecturer, times)
 * 2. Lecturer adds/generates Google Meet link
 * 3. Student checks in via GITDM → timestamp recorded → Meet opens
 * 4. Optionally reconcile with Meet participant sessions
 * 5. Lecturer finalises attendance
 */

import { getDb } from "@/lib/db";
import {
  isGoogleWorkspaceConfigured,
  createMeetSpace,
  listConferenceRecordsBySpace,
  listConferenceParticipants,
  listParticipantSessions,
} from "@/lib/google-workspace";
import { computeClearance } from "@/lib/finance-clearance";

export async function scheduleClass(params: {
  courseId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  lecturerUserId?: string;
  moduleId?: string;
  periodId?: string;
  venue?: string;
  notes?: string;
  scheduledById: string;
  createMeet?: boolean;
}) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  let googleMeetUrl: string | null = null;
  let googleMeetSpaceName: string | null = null;

  if (params.createMeet && isGoogleWorkspaceConfigured()) {
    try {
      const space = await createMeetSpace(params.title);
      googleMeetUrl = space.meetingUri || null;
      googleMeetSpaceName = space.name || null;
    } catch (err) {
      console.error("[attendance] Meet space creation failed:", err);
    }
  }

  return db.timetableEvent.create({
    data: {
      courseId: params.courseId,
      moduleId: params.moduleId || null,
      periodId: params.periodId || null,
      title: params.title.trim(),
      type: "CLASS",
      startAt: params.startAt,
      endAt: params.endAt,
      deliveryMode: googleMeetUrl ? "ONLINE" : "HYBRID",
      venue: params.venue || null,
      lecturerUserId: params.lecturerUserId || null,
      scheduledById: params.scheduledById,
      notes: params.notes || null,
      googleMeetUrl,
      googleMeetSpaceName,
      joinUrl: googleMeetUrl,
    },
  });
}

export async function setMeetLink(params: {
  eventId: string;
  meetUrl: string;
  actorId: string;
}) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  return db.timetableEvent.update({
    where: { id: params.eventId },
    data: {
      googleMeetUrl: params.meetUrl.trim(),
      joinUrl: params.meetUrl.trim(),
      deliveryMode: "ONLINE",
    },
  });
}

/**
 * Student check-in. Records joinedAt, then returns the Meet URL.
 * Requires learning access eligibility.
 */
export async function studentCheckIn(params: {
  eventId: string;
  userId: string;
}) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const event = await db.timetableEvent.findUnique({
    where: { id: params.eventId },
    include: { course: true },
  });
  if (!event) throw new Error("Class not found.");

  // Access gate
  const enrollment = await db.enrollment.findFirst({
    where: {
      userId: params.userId,
      status: { in: ["PENDING", "ACTIVE", "REPEATING"] },
      programmeId: event.course?.programmeId || undefined,
    },
  });
  if (enrollment) {
    const clearance = await computeClearance(enrollment.id);
    if (clearance && !clearance.learningAccessEligible && enrollment.accessLevel !== "FULL") {
      throw new Error(
        "Live class access requires the configured tuition payment threshold. Please complete payment first."
      );
    }
  }

  const now = new Date();
  const windowStart = new Date(event.startAt.getTime() - 30 * 60 * 1000); // 30 min early
  const windowEnd = new Date(event.endAt.getTime() + 15 * 60 * 1000);
  if (now < windowStart || now > windowEnd) {
    throw new Error("Check-in is only available around the scheduled class time.");
  }

  const record = await db.classAttendanceRecord.upsert({
    where: {
      userId_timetableEventId: {
        userId: params.userId,
        timetableEventId: params.eventId,
      },
    },
    create: {
      timetableEventId: params.eventId,
      userId: params.userId,
      courseId: event.courseId || "",
      periodId: event.periodId,
      date: event.startAt,
      status: "PRESENT",
      joinedAt: now,
      lastSeenAt: now,
      heartbeatCount: 1,
      source: "GITDM_CHECKIN",
    },
    update: {
      lastSeenAt: now,
      heartbeatCount: { increment: 1 },
      status: "PRESENT",
    },
  });

  return {
    record,
    meetUrl: event.googleMeetUrl || event.joinUrl || null,
  };
}

/** Heartbeat while student keeps the attendance page open (fallback duration). */
export async function attendanceHeartbeat(params: {
  eventId: string;
  userId: string;
}) {
  const db = getDb();
  if (!db) return;

  const existing = await db.classAttendanceRecord.findUnique({
    where: {
      userId_timetableEventId: {
        userId: params.userId,
        timetableEventId: params.eventId,
      },
    },
  });
  if (!existing?.joinedAt) return;

  const now = new Date();
  const minutes = Math.max(
    0,
    Math.round((now.getTime() - existing.joinedAt.getTime()) / 60000)
  );

  await db.classAttendanceRecord.update({
    where: { id: existing.id },
    data: {
      lastSeenAt: now,
      heartbeatCount: { increment: 1 },
      minutesAttended: minutes,
      leftAt: now,
    },
  });
}

/**
 * Reconcile GITDM check-ins with Google Meet participant sessions when available.
 */
export async function reconcileMeetAttendance(eventId: string) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");
  if (!isGoogleWorkspaceConfigured()) {
    return { reconciled: 0, message: "Google Workspace not configured." };
  }

  const event = await db.timetableEvent.findUnique({ where: { id: eventId } });
  if (!event?.googleMeetSpaceName && !event?.googleMeetUrl) {
    return { reconciled: 0, message: "No Meet link on this class." };
  }

  let reconciled = 0;
  try {
    if (!event.googleMeetSpaceName) {
      return { reconciled: 0, message: "No Meet space name stored for this class." };
    }
    const records = await listConferenceRecordsBySpace(event.googleMeetSpaceName);
    const conferences = records?.conferenceRecords || [];

    for (const conf of conferences) {
      const participants = await listConferenceParticipants(conf.name);
      for (const p of participants) {
        const sessions = await listParticipantSessions(p.name);
        const email =
          p?.signedinUser?.user || p?.anonymousUser?.displayName || null;
        if (!email) continue;

        // Match to GITDM user by email
        const user = await db.user.findFirst({
          where: { email: { equals: String(email).toLowerCase(), mode: "insensitive" } },
        });
        if (!user) continue;

        let totalMinutes = 0;
        for (const s of sessions) {
          if (s.startTime && s.endTime) {
            totalMinutes += Math.round(
              (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000
            );
          }
        }

        await db.classAttendanceRecord.upsert({
          where: {
            userId_timetableEventId: { userId: user.id, timetableEventId: eventId },
          },
          create: {
            timetableEventId: eventId,
            userId: user.id,
            courseId: event.courseId || "",
            periodId: event.periodId,
            date: event.startAt,
            status: totalMinutes > 0 ? "PRESENT" : "ABSENT",
            minutesAttended: totalMinutes,
            source: "GOOGLE_MEET",
            googleParticipantId: p.name,
            joinedAt: sessions[0]?.startTime ? new Date(sessions[0].startTime) : null,
            leftAt: sessions[sessions.length - 1]?.endTime
              ? new Date(sessions[sessions.length - 1].endTime)
              : null,
          },
          update: {
            minutesAttended: totalMinutes,
            source: "GOOGLE_MEET",
            googleParticipantId: p.name,
            status: totalMinutes > 0 ? "PRESENT" : "ABSENT",
          },
        });
        reconciled++;
      }
    }
  } catch (err) {
    console.error("[attendance] Meet reconcile failed:", err);
    return { reconciled, message: String(err) };
  }

  return { reconciled, message: `Reconciled ${reconciled} participant(s).` };
}

export async function listUpcomingClasses(userId: string, opts?: { lecturer?: boolean }) {
  const db = getDb();
  if (!db) return [];

  const now = new Date();
  const from = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  if (opts?.lecturer) {
    return db.timetableEvent.findMany({
      where: {
        lecturerUserId: userId,
        startAt: { gte: from, lte: to },
      },
      include: {
        course: true,
        attendance: { select: { id: true, userId: true, status: true, minutesAttended: true } },
      },
      orderBy: { startAt: "asc" },
    });
  }

  // Student: classes for courses in their programme
  const enrollment = await db.enrollment.findFirst({
    where: { userId, status: { in: ["PENDING", "ACTIVE", "REPEATING"] } },
    select: { programmeId: true },
  });
  if (!enrollment) return [];

  return db.timetableEvent.findMany({
    where: {
      startAt: { gte: from, lte: to },
      course: { programmeId: enrollment.programmeId, published: true },
    },
    include: {
      course: true,
      attendance: {
        where: { userId },
        select: { id: true, status: true, joinedAt: true, minutesAttended: true },
      },
    },
    orderBy: { startAt: "asc" },
  });
}
