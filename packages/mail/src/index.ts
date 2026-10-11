import { render } from "react-email";
import type { ReactElement } from "react";
import { sendMail, verifyConnection, resetTransporter } from "./nodemailer";
import type { SendEmailResult } from "./types";

export type { SendEmailResult, EmailOptions, MailConfig } from "./types";

export {
  sendMail,
  verifyConnection,
  resetTransporter,
} from "./nodemailer";

export {
  EmailVerification,
  PasswordReset,
  Welcome,
  DeleteAccount,
  ChangeEmail,
  InviteMember,
  MagicLink,
} from "./templates";

export async function sendEmail(
  to: string,
  subject: string,
  component: ReactElement,
): Promise<SendEmailResult> {
  // react-email v6's `render` is async — awaiting keeps `html` a string.
  const html = await render(component);
  return sendMail({ to, subject, html });
}
