import { Button, Section, Text } from "react-email";
import * as React from "react";
import { BaseLayout } from "./base-layout";

interface WelcomeProps {
  name: string;
  dashboardUrl: string;
}

export function Welcome({ name, dashboardUrl }: WelcomeProps) {
  return (
    <BaseLayout
      preview="Welcome to Formyst"
      heading={`Welcome to Formyst, ${name}`}
    >
      <Text style={text}>
        You're all set! Formyst makes it easy to build interactive forms and
        presentations that engage your audience.
      </Text>
      <Section style={featuresSection}>
        <Text style={featureItem}>✓ Create interactive forms in minutes</Text>
        <Text style={featureItem}>✓ Collect responses in real-time</Text>
        <Text style={featureItem}>
          ✓ Customize with your brand and style
        </Text>
      </Section>
      <Section style={buttonSection}>
        <Button href={dashboardUrl} style={button}>
          Go to Dashboard
        </Button>
      </Section>
      <Text style={text}>
        If you have any questions, just reply to this email — we'd love to help.
      </Text>
    </BaseLayout>
  );
}

Welcome.PreviewProps = {
  name: "John Doe",
  dashboardUrl: "https://formyst.com/dashboard",
} satisfies WelcomeProps;

export default Welcome;

const text = {
  color: "#3f3f46",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px 0",
};

const featuresSection = {
  backgroundColor: "#f4f4f5",
  borderRadius: "6px",
  padding: "16px 20px",
  margin: "16px 0",
};

const featureItem = {
  color: "#3f3f46",
  fontSize: "14px",
  lineHeight: "28px",
  margin: "0",
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
