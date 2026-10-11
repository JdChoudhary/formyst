import { Button, Section, Text } from "react-email";
import * as React from "react";
import { BaseLayout } from "./base-layout";

interface MagicLinkProps {
  name: string;
  magicLinkUrl: string;
}

export function MagicLink({ name, magicLinkUrl }: MagicLinkProps) {
  return (
    <BaseLayout
      preview="Sign in to Formyst"
      heading="Sign in to Formyst"
    >
      <Text style={text}>
        Hi {name}, click the button below to sign in to your account. This link
        is single-use and expires in 5 minutes.
      </Text>
      <Section style={buttonSection}>
        <Button href={magicLinkUrl} style={button}>
          Sign In
        </Button>
      </Section>
      <Text style={text}>
        If you didn't request this, you can safely ignore this email.
      </Text>
    </BaseLayout>
  );
}

MagicLink.PreviewProps = {
  name: "John Doe",
  magicLinkUrl: "https://formyst.com/auth/magic?token=abc123",
} satisfies MagicLinkProps;

export default MagicLink;

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
  backgroundColor: "#2563eb",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 24px",
};
