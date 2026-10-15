import crypto from "node:crypto";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";
const MEET_SCOPE = "https://www.googleapis.com/auth/meetings.space.created";
const PEOPLE_SCOPE = "https://www.googleapis.com/auth/directory.readonly";

function config() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  const subject = process.env.GOOGLE_WORKSPACE_IMPERSONATE_EMAIL?.trim();
  const calendarId = process.env.GOOGLE_CALENDAR_ID?.trim() || "primary";
  // Meet REST calls are user-authorized. A service account must impersonate a
  // Workspace user (domain-wide delegation) before the integration is considered ready.
  if (!email || !privateKey || !subject) return null;
  return { email, privateKey, subject, calendarId };
}

function base64url(input: string | Buffer) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function accessToken(scopes: string[]) {
  const cfg = config();
  if (!cfg) throw new Error("Google Workspace integration is not configured. Add GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY and GOOGLE_WORKSPACE_IMPERSONATE_EMAIL.");
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(JSON.stringify({
    iss: cfg.email,
    scope: scopes.join(" "),
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    ...(cfg.subject ? { sub: cfg.subject } : {}),
  }));
  const unsigned = `${header}.${claim}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${base64url(signer.sign(cfg.privateKey))}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }).toString(),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Google token request failed (${response.status}): ${await response.text()}`);
  const json = await response.json() as { access_token?: string };
  if (!json.access_token) throw new Error("Google token response did not contain an access token.");
  return json.access_token;
}

async function googleFetch(url: string, init: RequestInit = {}, scopes: string[] = [CALENDAR_SCOPE]) {
  const token = await accessToken(scopes);
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(url, { ...init, headers, cache: "no-store" });
  const text = await response.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error(`Google API request failed (${response.status}): ${typeof body === "string" ? body : JSON.stringify(body)}`);
  return body;
}

export function isGoogleWorkspaceConfigured() {
  return Boolean(config());
}

export async function createMeetSpace(_displayName: string) {
  const body = await googleFetch("https://meet.googleapis.com/v2/spaces", {
    method: "POST",
    body: JSON.stringify({}),
  }, [MEET_SCOPE]);
  return {
    name: body?.name as string | undefined,
    meetingUri: body?.meetingUri as string | undefined,
    meetingCode: body?.meetingCode as string | undefined,
  };
}

export async function endMeetConference(spaceName: string) {
  return googleFetch(`https://meet.googleapis.com/v2/${spaceName}:endActiveConference`, { method: "POST", body: "{}" }, [MEET_SCOPE]);
}

export async function createCalendarClassEvent(input: {
  eventId: string;
  title: string;
  description?: string;
  startAt: Date;
  endAt: Date;
  timeZone?: string;
  meetingUrl?: string;
  attendees?: string[];
}) {
  const cfg = config();
  if (!cfg) throw new Error("Google Workspace integration is not configured.");
  const params = new URLSearchParams({ sendUpdates: "all" });
  const event = await googleFetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cfg.calendarId)}/events?${params.toString()}`,
    {
      method: "POST",
      body: JSON.stringify({
        id: input.eventId,
        summary: input.title,
        description: `${input.description || ""}${input.meetingUrl ? `\n\nGoogle Meet: ${input.meetingUrl}` : ""}`,
        start: { dateTime: input.startAt.toISOString(), timeZone: input.timeZone || "Africa/Kampala" },
        end: { dateTime: input.endAt.toISOString(), timeZone: input.timeZone || "Africa/Kampala" },
        location: input.meetingUrl || undefined,
        attendees: (input.attendees || []).filter(Boolean).map((email) => ({ email })),
        reminders: { useDefault: true },
      }),
    },
    [CALENDAR_SCOPE],
  );
  return { id: event?.id as string | undefined, htmlLink: event?.htmlLink as string | undefined };
}

export async function updateCalendarClassEnd(eventId: string, endAt: Date) {
  const cfg = config();
  if (!cfg) throw new Error("Google Workspace integration is not configured.");
  return googleFetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cfg.calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    { method: "PATCH", body: JSON.stringify({ end: { dateTime: endAt.toISOString(), timeZone: process.env.GOOGLE_TIME_ZONE || "Africa/Kampala" } }) },
    [CALENDAR_SCOPE],
  );
}

export async function listConferenceRecordsBySpace(spaceName: string) {
  const filter = encodeURIComponent(`space.name = "${spaceName}"`);
  return googleFetch(`https://meet.googleapis.com/v2/conferenceRecords?pageSize=100&filter=${filter}`, { method: "GET" }, [MEET_SCOPE]);
}

export async function listConferenceParticipants(conferenceName: string) {
  const all: any[] = [];
  let pageToken = "";
  do {
    const url = new URL(`https://meet.googleapis.com/v2/${conferenceName}/participants`);
    url.searchParams.set("pageSize", "250");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const page = await googleFetch(url.toString(), { method: "GET" }, [MEET_SCOPE]);
    all.push(...(page?.participants || []));
    pageToken = page?.nextPageToken || "";
  } while (pageToken);
  return all;
}

export async function listParticipantSessions(participantName: string) {
  const all: any[] = [];
  let pageToken = "";
  do {
    const url = new URL(`https://meet.googleapis.com/v2/${participantName}/participantSessions`);
    url.searchParams.set("pageSize", "250");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const page = await googleFetch(url.toString(), { method: "GET" }, [MEET_SCOPE]);
    all.push(...(page?.participantSessions || []));
    pageToken = page?.nextPageToken || "";
  } while (pageToken);
  return all;
}

export async function getPersonEmail(personId: string) {
  try {
    const body = await googleFetch(`https://people.googleapis.com/v1/people/${encodeURIComponent(personId)}?personFields=names,emailAddresses`, { method: "GET" }, [PEOPLE_SCOPE]);
    const email = body?.emailAddresses?.find((e: any) => e.value)?.value;
    return typeof email === "string" ? email.toLowerCase() : null;
  } catch {
    return null;
  }
}
