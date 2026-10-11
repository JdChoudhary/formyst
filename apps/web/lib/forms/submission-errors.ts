/**
 * Parses trpc-to-openapi field-level validation failures.
 * The submit endpoint returns HTTP 400 with
 * { message, code, issues: [{ path: [fieldId], message }] }.
 */
export function parseFieldErrors(result: unknown): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  const issues = (result as {
    issues?: Array<{ path?: Array<string | number>; message?: unknown }>;
  })?.issues;

  if (Array.isArray(issues)) {
    for (const issue of issues) {
      if (issue?.path?.[0] !== undefined && typeof issue.message === "string") {
        fieldErrors[String(issue.path[0])] = issue.message;
      }
    }
  }

  return fieldErrors;
}
