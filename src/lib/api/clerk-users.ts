/**
 * Splits a single display name into Clerk's `firstName`/`lastName` fields.
 *
 * The app stores one `name`; Clerk models given/family names separately. The
 * first whitespace-delimited token becomes `firstName`, the remainder
 * `lastName` (undefined when the name is a single token).
 */
export function splitName(name: string): { firstName: string; lastName: string | undefined } {
  const [firstName, ...rest] = name.trim().split(/\s+/);
  return { firstName: firstName ?? "", lastName: rest.join(" ") || undefined };
}
