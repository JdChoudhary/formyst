import { z } from "zod";

export const emailOptionsSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  template: z.string(),
  props: z.record(z.string(), z.unknown()),
});

export type EmailOptions = z.infer<typeof emailOptionsSchema>;

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}
