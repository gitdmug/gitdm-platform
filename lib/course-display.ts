/** Human-facing title for the three currently offered courses. Legacy course
 * records remain in the database, but are not exposed as separate offerings. */
export function courseDisplayTitle(code: string, storedTitle: string) {
  if (code === "FFM-101") return "Certificate in Financial Markets, Trading and Derivatives";
  return storedTitle;
}
