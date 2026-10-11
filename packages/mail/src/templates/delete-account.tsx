import { Button, Section, Text } from "react-email";
import * as React from "react";
import { BaseLayout } from "./base-layout";

interface DeleteAccountProps {
  name: string;
  confirmationUrl: string;
}

export function DeleteAccount({ name, confirmationUrl }: DeleteAccountProps) {
  return (
    <BaseLayout
      preview="Confirm account deletion"
      heading="Confirm account deletion"
    >
      <Text style={text}>
        Hi {name}, you requested to delete your Formyst account. This action is
        permanent and cannot be undone.
      </Text>
      <Text style={warningText}>
        All your forms, presentations, and data will be permanently removed.
      </Text>
      <Section style={buttonSection}>
        <Button href={confirmationUrl} style={button}>
          Delete My Account
        </Button>
      </Section>
      <Text style={text}>
        If you didn't request this, please secure your account immediately by
        changing your password.
      </Text>
    </BaseLayout>
  );
}

DeleteAccount.PreviewProps = {
  name: "John Doe",
  confirmationUrl: "https://formyst.com/auth/delete?token=abc123",
} satisfies DeleteAccountProps;

export default DeleteAccount;

const text = {
  color: "#3f3f46",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px 0",
};

const warningText = {
  color: "#dc2626",
  fontSize: "14px",
  fontWeight: "600",
  lineHeight: "24px",
  backgroundColor: "#fef2f2",
  borderRadius: "6px",
  padding: "12px 16px",
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
