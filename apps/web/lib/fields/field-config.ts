import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Calendar,
  CheckSquare,
  ChevronDown,
  Circle,
  CreditCard,
  Grid3X3,
  Hash,
  Image,
  Link2,
  ListOrdered,
  Mail,
  Megaphone,
  MessageSquare,
  PenLine,
  Phone,
  SeparatorHorizontal,
  Sliders,
  Square,
  Star,
  Tag,
  Type,
  ToggleLeft,
  Upload,
  Users,
} from "lucide-react";
import type { FieldProperties, FormField } from "@repo/shared";
import { createFieldId, createRef } from "@repo/shared";

export interface FieldTypeConfig {
  canBeGrouped?: boolean;
  category: "input" | "selection" | "media" | "layout" | "advanced";
  defaultLabel: string;
  defaultOptions?: string[];
  defaultProperties?: FieldProperties;
  description: string;
  icon: LucideIcon;
  label: string;
  type: FormField["type"];
}

export const FIELD_TYPE_CONFIGS: FieldTypeConfig[] = [
  // ------------------------------------------------------------- input
  {
    type: "short_text",
    label: "Short Text",
    description: "A single line for short text responses.",
    icon: Type,
    category: "input",
    defaultLabel: "What's your answer?",
    defaultProperties: { placeholder: "Type your answer..." },
    canBeGrouped: true,
  },
  {
    type: "long_text",
    label: "Long Text",
    description: "A multi-line field for longer text.",
    icon: MessageSquare,
    category: "input",
    defaultLabel: "Tell us more",
    defaultProperties: { placeholder: "Write your answer..." },
    canBeGrouped: true,
  },
  {
    type: "email",
    label: "Email",
    description: "Collect a valid email address.",
    icon: Mail,
    category: "input",
    defaultLabel: "What's your email address?",
    defaultProperties: { placeholder: "name@example.com" },
    canBeGrouped: true,
  },
  {
    type: "number",
    label: "Number",
    description: "Input for numeric values.",
    icon: Hash,
    category: "input",
    defaultLabel: "Enter a number",
    defaultProperties: { placeholder: "Type a number..." },
    canBeGrouped: true,
  },
  {
    type: "phone_number",
    label: "Phone Number",
    description: "Input for phone numbers with validation.",
    icon: Phone,
    category: "input",
    defaultLabel: "What's your phone number?",
    defaultProperties: { placeholder: "Your phone number" },
    canBeGrouped: true,
  },
  {
    type: "website",
    label: "Website",
    description: "Input for a valid website URL.",
    icon: Link2,
    category: "input",
    defaultLabel: "What's your website?",
    defaultProperties: { placeholder: "https://..." },
    canBeGrouped: true,
  },
  {
    type: "date",
    label: "Date",
    description: "Pick a date from a calendar.",
    icon: Calendar,
    category: "input",
    defaultLabel: "What date is this?",
    canBeGrouped: true,
  },
  {
    type: "tags",
    label: "Tags",
    description: "Let respondents add their own tags (press Enter to add).",
    icon: Tag,
    category: "input",
    defaultLabel: "Add tags",
    defaultProperties: {
      placeholder: "Type and press Enter...",
      max_tags: 20,
      allow_duplicates: false,
    },
    canBeGrouped: true,
  },
  {
    type: "contact_info",
    label: "Contact Info",
    description: "First/last name, email, phone, company and address in one field.",
    icon: Users,
    category: "input",
    defaultLabel: "How can we reach you?",
  },

  // ------------------------------------------------------------- selection
  {
    type: "multiple_choice",
    label: "Multiple Choice",
    description: "Pick a single option from a list.",
    icon: Circle,
    category: "selection",
    defaultLabel: "Which option do you prefer?",
    defaultOptions: ["Option 1", "Option 2"],
    defaultProperties: {
      allow_multiple_selection: false,
      randomize: false,
      allow_other_choice: false,
      vertical_alignment: true,
    },
    canBeGrouped: true,
  },
  {
    type: "checkbox",
    label: "Checkboxes",
    description: "Select one or more options.",
    icon: CheckSquare,
    category: "selection",
    defaultLabel: "Choose all that apply",
    defaultOptions: ["Option 1", "Option 2"],
    defaultProperties: {
      allow_multiple_selection: true,
      randomize: false,
      allow_other_choice: false,
      vertical_alignment: true,
    },
    canBeGrouped: true,
  },
  {
    type: "dropdown",
    label: "Dropdown",
    description: "Dropdown to choose one option.",
    icon: ChevronDown,
    category: "selection",
    defaultLabel: "Select an option",
    defaultOptions: ["Option 1", "Option 2"],
    defaultProperties: {
      randomize: false,
      alphabetical_order: false,
      allow_other_choice: false,
    },
    canBeGrouped: true,
  },
  {
    type: "picture_choice",
    label: "Picture Choice",
    description: "Choose an option displayed as an image.",
    icon: Image,
    category: "selection",
    defaultLabel: "Which picture do you prefer?",
    defaultOptions: ["Option 1", "Option 2"],
    defaultProperties: {
      allow_multiple_selection: false,
      randomize: false,
      vertical_alignment: true,
    },
  },
  {
    type: "ranking",
    label: "Ranking",
    description: "Order options by preference.",
    icon: ListOrdered,
    category: "selection",
    defaultLabel: "Rank these in order of preference",
    defaultOptions: ["Option 1", "Option 2", "Option 3"],
    defaultProperties: { randomize: false },
  },
  {
    type: "rating",
    label: "Rating",
    description: "Collect a star or icon rating.",
    icon: Star,
    category: "selection",
    defaultLabel: "How would you rate this?",
    defaultProperties: { steps: 5, shape: "star", start_at_one: true },
  },
  {
    type: "opinion_scale",
    label: "Opinion Scale",
    description: "A 5–11 step agreement scale.",
    icon: Sliders,
    category: "selection",
    defaultLabel: "How much do you agree?",
    defaultProperties: { steps: 5, start_at_one: true },
  },
  {
    type: "nps",
    label: "NPS",
    description: "Net Promoter Score (0–10).",
    icon: BarChart3,
    category: "selection",
    defaultLabel: "How likely are you to recommend us?",
    defaultProperties: {
      labels: { left: "Not likely", right: "Extremely likely" },
    },
  },
  {
    type: "matrix",
    label: "Matrix",
    description: "Rate rows against columns (Likert scale).",
    icon: Grid3X3,
    category: "selection",
    defaultLabel: "How do you feel about each item?",
    defaultProperties: { allow_multiple_selection: false },
  },
  {
    type: "yes_no",
    label: "Yes / No",
    description: "A simple yes or no question.",
    icon: ToggleLeft,
    category: "selection",
    defaultLabel: "Would you like to continue?",
    defaultProperties: { labels: { left: "No", right: "Yes" } },
  },

  // ------------------------------------------------------------- media
  {
    type: "file_upload",
    label: "File Upload",
    description: "Upload files with size and type limits.",
    icon: Upload,
    category: "media",
    defaultLabel: "Upload a file",
  },
  {
    type: "signature",
    label: "Signature",
    description: "Draw or sign with mouse or touch.",
    icon: PenLine,
    category: "media",
    defaultLabel: "Please sign here",
  },

  // ------------------------------------------------------------- layout
  {
    type: "divider",
    label: "Divider",
    description: "Separate sections with a horizontal rule.",
    icon: SeparatorHorizontal,
    category: "layout",
    defaultLabel: "Divider",
    defaultProperties: {
      divider_style: "solid",
      align: "center",
    },
  },
  {
    type: "banner",
    label: "Banner",
    description: "Call out information with an info, success, warning or error banner.",
    icon: Megaphone,
    category: "layout",
    defaultLabel: "Banner",
    defaultProperties: {
      banner_variant: "info",
      banner_title: "Heads up",
      description: "Add important information your respondents should see.",
    },
  },
  {
    type: "statement",
    label: "Statement",
    description: "Display a heading or description in the form.",
    icon: Square,
    category: "layout",
    defaultLabel: "Statement",
    defaultProperties: {
      description: "Description text",
      show_button: true,
      button_text: "Continue",
    },
  },

  // ------------------------------------------------------------- advanced
  {
    type: "payment",
    label: "Payment",
    description: "Collect a payment.",
    icon: CreditCard,
    category: "advanced",
    defaultLabel: "Payment",
    defaultProperties: { currency: "USD" },
  },
];

export function getFieldTypeConfig(type: FormField["type"]): FieldTypeConfig | undefined {
  return FIELD_TYPE_CONFIGS.find((config) => config.type === type);
}

export function getFieldTypesByCategory(category: FieldTypeConfig["category"]): FieldTypeConfig[] {
  return FIELD_TYPE_CONFIGS.filter((config) => config.category === category);
}

export function getGroupableFieldTypes(): FieldTypeConfig[] {
  return FIELD_TYPE_CONFIGS.filter((config) => config.canBeGrouped);
}

/** Build a default field for a palette-selected type (new schema shape). */
export function createFieldFromType(type: FormField["type"]): FormField {
  const config = getFieldTypeConfig(type);
  if (!config) {
    throw new Error(`Unknown field type: ${type}`);
  }

  const properties: FieldProperties = { ...(config.defaultProperties ?? {}) };

  if (config.defaultOptions) {
    properties.choices = config.defaultOptions.map((label) => ({
      ref: createRef(label),
      label,
    }));
  }

  return {
    // Unique per-instance ref: fields are keyed by `ref` in the v2 schema and
    // the builder uses it for selection, deletion, and reordering. Refs must
    // be unique or answers would collide in the renderer.
    ref: createFieldId("field"),
    title: config.defaultLabel || config.label,
    type: config.type,
    properties,
    validations: {},
  };
}

function generateFieldId(): string {
  return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const FIELD_TYPES = FIELD_TYPE_CONFIGS.map((config) => ({
  type: config.type,
  label: config.label,
  description: config.description,
  icon: config.icon,
}));

export const FIELD_CATEGORIES = {
  input: "Input Fields",
  selection: "Selection Fields",
  media: "Media Fields",
  layout: "Layout Fields",
  advanced: "Advanced Fields",
} as const;

export { generateFieldId };
