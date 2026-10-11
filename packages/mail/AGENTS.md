# Mail Package — AI Agent Guide

> Email service using React Email templates and Nodemailer transport.

## Overview

This package (`@repo/mail`) provides a complete email sending service with React Email templates and Nodemailer as the SMTP transport. It is currently **standalone** — not integrated into any app yet.

## Key Files

```
packages/mail/
├── src/
│   ├── index.ts              # Main exports (sendEmail, templates, transport)
│   ├── types.ts              # Zod schemas and TypeScript types
│   ├── nodemailer.ts         # Nodemailer transport configuration
│   └── templates/
│       ├── base-layout.tsx   # Shared email layout (header, footer, container)
│       ├── email-verification.tsx
│       ├── password-reset.tsx
│       ├── welcome.tsx
│       ├── delete-account.tsx
│       ├── change-email.tsx
│       ├── invite-member.tsx
│       ├── magic-link.tsx
│       └── index.ts          # Re-exports all templates
├── package.json
└── tsconfig.json
```

## Usage

```typescript
import { sendEmail, EmailVerification, Welcome } from "@repo/mail";

// Send email verification
await sendEmail(
  "user@example.com",
  "Verify your email",
  <EmailVerification name="John" verificationUrl="https://..." />
);

// Send welcome email
await sendEmail(
  "user@example.com",
  "Welcome to Formyst",
  <Welcome name="John" dashboardUrl="https://..." />
);
```

## Available Templates

| Template | Props | Description |
|----------|-------|-------------|
| `EmailVerification` | `name`, `verificationUrl` | Email verification with CTA button |
| `PasswordReset` | `name`, `resetUrl` | Password reset link (expires 1hr) |
| `Welcome` | `name`, `dashboardUrl` | Welcome email with feature list |
| `DeleteAccount` | `name`, `confirmationUrl` | Account deletion confirmation |
| `ChangeEmail` | `name`, `newEmail`, `confirmationUrl` | Email change confirmation |
| `InviteMember` | `inviterName`, `organizationName`, `inviteUrl` | Org member invitation |
| `MagicLink` | `name`, `magicLinkUrl` | Passwordless sign-in link |

## Environment Variables

```env
SMTP_HOST=smtp.resend.com       # SMTP server host
SMTP_PORT=587                   # SMTP server port
SMTP_SECURE=false               # Use TLS (true for port 465)
SMTP_USER=resend                # SMTP auth user
SMTP_PASS=re_xxxxx              # SMTP auth password
SMTP_FROM=Formyst <noreply@formyst.com>  # Sender address
```

## Low-Level API

```typescript
import { sendMail, verifyConnection } from "@repo/mail";

// Verify SMTP connection
const ok = await verifyConnection();

// Send raw HTML email
const result = await sendMail({
  to: "user@example.com",
  subject: "Hello",
  html: "<p>Hello World</p>",
});
```

## Adding a New Template

1. Create `src/templates/my-template.tsx`
2. Export props interface and component
3. Add `PreviewProps` for React Email dev preview
4. Re-export from `src/templates/index.ts`
5. Re-export from `src/index.ts`

## Important Notes

1. **Standalone** — Not integrated yet; will be wired into `@repo/auth` and `@repo/services` later
2. **React Email 6.x** — All imports come from `react-email` (unified package)
3. **Preview** — Run `pnpm preview` to see templates at `http://localhost:3080`
4. **HTML Rendering** — `render()` from `react-email` converts JSX to email-safe HTML
