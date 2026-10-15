import { addCalendarMonths, makeKampalaDate, scheduleForCourse, type DeliverySession } from "@/lib/academic-schedule";

export type ScheduleHoliday = { date: Date; name: string };

export function generateShortCourseSessions(args: {
  courseCode: "TA101" | "FX3M";
  startDate: Date;
  session: DeliverySession;
  holidays: ScheduleHoliday[];
}) {
  const config = scheduleForCourse(args.courseCode);
  if (!config) throw new Error("This course does not have an automatic timetable pattern.");
  const time = args.session === "EVENING" ? config.evening : config.morning;
  const targetSessions = config.durationMonths === 1 ? 12 : 24;
  const nominalEnd = addCalendarMonths(args.startDate, config.durationMonths);
  const holidayKeys = new Map(args.holidays.map(h => [h.date.toISOString().slice(0, 10), h.name]));
  const events: Array<{ date: Date; startAt: Date; endAt: Date; holidaySkipped?: string }> = [];
  let cursor = new Date(Date.UTC(args.startDate.getUTCFullYear(), args.startDate.getUTCMonth(), args.startDate.getUTCDate()));
  let safety = 0;
  while (events.length < targetSessions && safety < 370) {
    safety++;
    const day = cursor.getUTCDay();
    const key = cursor.toISOString().slice(0, 10);
    if (config.days.includes(day as never) && !holidayKeys.has(key)) {
      events.push({ date: new Date(cursor), startAt: makeKampalaDate(cursor, time[0]), endAt: makeKampalaDate(cursor, time[1]) });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return { events, nominalEnd, actualEnd: events.at(-1)?.date ?? args.startDate };
}
