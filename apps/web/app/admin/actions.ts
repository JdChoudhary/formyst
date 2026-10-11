"use server";

import { listUserEmails, requireAdmin } from "@/lib/admin/data";
import { sendFormNotification } from "@/lib/services/notifications";

const EMAIL_SEPARATOR_REGEX = /[\n,]/;

export type AnnouncementResult = { ok: true; sent: number } | { ok: false; error: string };

/** Returns every registered user's email so the announcement form can prefill it. */
export async function listUserEmailsAction(): Promise<string[]> {
  await requireAdmin();
  return listUserEmails();
}

export async function sendAnnouncementAction(formData: FormData): Promise<AnnouncementResult> {
  await requireAdmin();

  let toRaw = String(formData.get("to") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  const content = String(formData.get("content") || "").trim();

  if (!toRaw) {
    toRaw = (await listUserEmails()).join(", ");
  }
  if (!(toRaw && subject && content)) {
    return { ok: false, error: "All fields are required" };
  }

  const recipients = toRaw
    .split(EMAIL_SEPARATOR_REGEX)
    .map((value) => value.trim())
    .filter(Boolean);

  try {
    let sent = 0;
    for (const email of recipients) {
      await sendFormNotification({ to: email, subject, message: content });
      sent += 1;
    }
    return { ok: true, sent };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
