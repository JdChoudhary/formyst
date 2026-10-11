import { Button, Link, Section, Text } from "react-email";
import * as React from "react";
import { BaseLayout } from "./base-layout";

interface PasswordResetProps {
  name: string;
  resetUrl: string;
}

export function PasswordReset({ name, resetUrl }: PasswordResetProps) {
  return (
    <BaseLayout
      preview="Reset your password"
      heading="Reset your password"
    >
      <Text style={text}>
        Hi {name}, we received a request to reset your password. Click the
        button below to choose a new one.
      </Text>
      <Section style={buttonSection}>
        <Button href={resetUrl} style={button}>
          Reset Password
        </Button>
      </Section>
      <Text style={text}>
        Or copy and paste this link into your browser:
      </Text>
      <Link href={resetUrl} style={link}>
        {resetUrl}
      </Link>
      <Text style={smallText}>
        This link will expire in 1 hour. If you didn't request a password
        reset, you can safely ignore this email — your password will remain
        unchanged.
      </Text>
    </BaseLayout>
  );
}

PasswordReset.PreviewProps = {
  name: "John Doe",
  resetUrl: "https://formyst.com/auth/reset?token=abc123",
} satisfies PasswordResetProps;

export default PasswordReset;

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
  backgroundColor: "#dc2626",
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
