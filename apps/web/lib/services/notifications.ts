export interface FormNotificationInput {
  to: string;
  subject: string;
  message: string;
}

const API_BASE =
  process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Send a transactional email through the API's mail service.
 *
 * Throws when the API rejects the request (e.g. SMTP is not configured) so the
 * admin announcement UI can surface a real error instead of silently claiming
 * success.
 */
export async function sendFormNotification({
  to,
  subject,
  message,
}: FormNotificationInput): Promise<void> {
  const res = await fetch(`${API_BASE}/api/notifications/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, subject, message }),
    cache: "no-store",
  });

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { message?: string; error?: string };
      detail = body.message || body.error || detail;
    } catch {
      // keep the status-based message
    }
    throw new Error(detail);
  }
}
