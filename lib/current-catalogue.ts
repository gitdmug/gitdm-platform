export const ACTIVE_PROGRAMME_CODES = [
  "GITDM-CFMTD",
  "GITDM-FX3M",
  "GITDM-TA1M",
] as const;

// Only the three programmes currently offered are surfaced as courses.
// FFM-101 is the existing record used to represent the 12-month flagship
// certificate. Legacy/internal FFM-102..FFM-115 records remain untouched in the
// database for historical integrity, but are not shown as separate courses.
export const ACTIVE_COURSE_CODES = ["TA101", "FX3M", "FFM-101"] as const;

export const ACTIVE_FACULTY_CODES = ["FFM"] as const;
