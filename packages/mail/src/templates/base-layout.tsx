import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "react-email";
import * as React from "react";

interface BaseLayoutProps {
  preview: string;
  heading: string;
  children: React.ReactNode;
}

export function BaseLayout({ preview, heading, children }: BaseLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Heading style={logo}>Formyst</Heading>
          </Section>

          <Section style={contentSection}>
            <Heading style={h1}>{heading}</Heading>
            {children}
          </Section>

          <Hr style={hr} />

          <Section style={footerSection}>
            <Text style={footerText}>
              If you didn't request this, you can safely ignore this email.
            </Text>
            <Text style={footerText}>
              © {new Date().getFullYear()} Formyst. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f4f4f5",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  padding: "40px 0",
};

const container = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  margin: "0 auto",
  maxWidth: "600px",
  overflow: "hidden" as const,
};

const logoSection = {
  backgroundColor: "#18181b",
  padding: "24px 40px",
};

const logo = {
  color: "#ffffff",
  fontSize: "22px",
  fontWeight: "700",
  margin: 0,
  letterSpacing: "-0.02em",
};

const contentSection = {
  padding: "40px",
};

const h1 = {
  color: "#18181b",
  fontSize: "24px",
  fontWeight: "700",
  margin: "0 0 24px 0",
  letterSpacing: "-0.02em",
};

const hr = {
  borderColor: "#e4e4e7",
  margin: 0,
};

const footerSection = {
  padding: "24px 40px",
  textAlign: "center" as const,
};

const footerText = {
  color: "#a1a1aa",
  fontSize: "13px",
  lineHeight: "22px",
  margin: "0 0 4px 0",
};
