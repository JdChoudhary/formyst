import { Button, Link, Section, Text } from "react-email";
import * as React from "react";
import { BaseLayout } from "./base-layout";

interface ChangeEmailProps {
  name: string;
  newEmail: string;
  confirmationUrl: string;
}

export function ChangeEmail({
  name,
  newEmail,
  confirmationUrl,
}: ChangeEmailProps) {
  return (
    <BaseLayout
      preview="Confirm your new email"
      heading="Confirm email change"
    >
      <Text style={text}>
        Hi {name}, you requested to change your email address to{" "}
        <strong>{newEmail}</strong>.
      </Text>
      <Text style={text}>
        Click the button below to confirm this change. Your old email will
        remain active until the new one is verified.
      </Text>
      <Section style={buttonSection}>
        <Button href={confirmationUrl} style={button}>
          Confirm New Email
        </Button>
      </Section>
      <Text style={text}>
        Or copy and paste this link into your browser:
      </Text>
      <Link href={confirmationUrl} style={link}>
        {confirmationUrl}
      </Link>
      <Text style={smallText}>
        If you didn't request this change, please secure your account
        immediately.
      </Text>
    </BaseLayout>
  );
}

ChangeEmail.PreviewProps = {
  name: "John Doe",
  newEmail: "newemail@example.com",
  confirmationUrl: "https://formyst.com/auth/change-email?token=abc123",
} satisfies ChangeEmailProps;

export default ChangeEmail;

const text = {
  color: "#3f3f46",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px 0",
};

const buttonSection = {
  margin: "24px 0",
};

const button = {
  backgroundColor: "#18181b",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 24px",
};

const link = {
  color: "#2563eb",
  fontSize: "14px",
  textDecoration: "underline",
  wordBreak: "break-all" as const,
};

const smallText = {
  color: "#a1a1aa",
  fontSize: "13px",
  lineHeight: "22px",
  margin: "24px 0 0 0",
};
