import { Button, Link, Section, Text } from "react-email";
import * as React from "react";
import { BaseLayout } from "./base-layout";

interface InviteMemberProps {
  inviterName: string;
  organizationName: string;
  inviteUrl: string;
}

export function InviteMember({
  inviterName,
  organizationName,
  inviteUrl,
}: InviteMemberProps) {
  return (
    <BaseLayout
      preview={`${inviterName} invited you to ${organizationName}`}
      heading="You've been invited"
    >
      <Text style={text}>
        <strong>{inviterName}</strong> has invited you to join{" "}
        <strong>{organizationName}</strong> on Formyst.
      </Text>
      <Text style={text}>
        Accept the invite to start collaborating on forms and presentations with
        your team.
      </Text>
      <Section style={buttonSection}>
        <Button href={inviteUrl} style={button}>
          Accept Invite
        </Button>
      </Section>
      <Text style={text}>
        Or copy and paste this link into your browser:
      </Text>
      <Link href={inviteUrl} style={link}>
        {inviteUrl}
      </Link>
      <Text style={smallText}>
        This invite will expire in 7 days. If you don't have a Formyst account,
        you'll be prompted to create one.
      </Text>
    </BaseLayout>
  );
}

InviteMember.PreviewProps = {
  inviterName: "Jane Smith",
  organizationName: "Acme Corp",
  inviteUrl: "https://formyst.com/invite?token=abc123",
} satisfies InviteMemberProps;

export default InviteMember;

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
