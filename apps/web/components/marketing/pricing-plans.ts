export type MarketingPlan = {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  variant: "default" | "outline";
  popular?: boolean;
};

export const marketingPlans: MarketingPlan[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "A generous starting point for personal projects and small experiments.",
    features: [
      "Unlimited forms",
      "100 responses per month",
      "Basic response analytics",
      "Email notifications",
      "Formyst branding",
    ],
    cta: "Start free",
    variant: "outline",
  },
  {
    name: "Pro",
    price: "$12",
    period: "per month",
    description: "More control for professionals collecting feedback, leads, and applications.",
    features: [
      "Everything in Free",
      "Unlimited responses",
      "Advanced analytics and charts",
      "Custom themes and branding",
      "Conditional logic",
      "Webhook integrations",
      "Priority support",
    ],
    cta: "Start with Pro",
    variant: "default",
    popular: true,
  },
  {
    name: "Team",
    price: "$29",
    period: "per month",
    description: "Shared workflows and governance for teams building forms together.",
    features: [
      "Everything in Pro",
      "Team workspaces",
      "Roles and permissions",
      "Audit logs",
      "API access",
      "Custom integrations",
      "Dedicated support",
    ],
    cta: "Choose Team",
    variant: "outline",
  },
];
