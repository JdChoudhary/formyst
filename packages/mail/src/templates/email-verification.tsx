import { Button, Link, Section, Text } from "react-email";
import * as React from "react";
import { BaseLayout } from "./base-layout";

interface EmailVerificationProps {
  name: string;
  verificationUrl: string;
}

export function EmailVerification({
  name,
  verificationUrl,
}: EmailVerificationProps) {
  return (
    <BaseLayout
      preview="Verify your email address"
      heading="Verify your email"
    >
      <Text style={text}>
        Hi {name}, thanks for signing up for Formyst. Please verify your email
        address to get started.
      </Text>
      <Section style={buttonSection}>
        <Button href={verificationUrl} style={button}>
          Verify Email
        </Button>
      </Section>
      <Text style={text}>
        Or copy and paste this link into your browser:
      </Text>
      <Link href={verificationUrl} style={link}>
        {verificationUrl}
      </Link>
      <Text style={smallText}>
        This link will expire in 24 hours. If you didn't create an account, you
        can safely ignore this email.
      </Text>
    </BaseLayout>
  );
}

EmailVerification.PreviewProps = {
  name: "John Doe",
  verificationUrl: "https://formyst.com/auth/verify?token=abc123",
} satisfies EmailVerificationProps;

export default EmailVerification;

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
