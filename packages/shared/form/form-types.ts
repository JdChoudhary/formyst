import type { z } from "zod";
import type {
  formSchema,
  formSettingsSchema,
  quizSettingsSchema,
  themeSchema,
  typeformThemeSchema,
  typeformThemeBackgroundSchema,
  typeformThemeColorsSchema,
  typeformThemeFieldsSchema,
  typeformThemeScreensSchema,
  welcomeScreenSchema,
  thankyouScreenSchema,
  brandingSchema,
  brandingVisibilitySchema,
  brandingPositionSchema,
  logoSizeSchema,
  logicRuleSchema,
  logicActionSchema,
  conditionSchema,
  valueReferenceSchema,
  scoringRuleSchema,
  outcomeSchema,
  variableDefinitionSchema,
  calculationExpressionSchema,
  choiceSchema,
  attachmentSchema,
  layoutSchema,
  validationsSchema,
  priceSchema,
} from "./form-schema";

export type FormSchema = z.infer<typeof formSchema>;
export type FormSettings = z.infer<typeof formSettingsSchema>;
export type QuizSettings = z.infer<typeof quizSettingsSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type Branding = z.infer<typeof brandingSchema>;
export type BrandingVisibility = z.infer<typeof brandingVisibilitySchema>;
export type BrandingPosition = z.infer<typeof brandingPositionSchema>;
export type LogoSize = z.infer<typeof logoSizeSchema>;
export type TypeformTheme = z.infer<typeof typeformThemeSchema>;
export type TypeformThemeBackground = z.infer<typeof typeformThemeBackgroundSchema>;
export type TypeformThemeColors = z.infer<typeof typeformThemeColorsSchema>;
export type TypeformThemeFields = z.infer<typeof typeformThemeFieldsSchema>;
export type TypeformThemeScreens = z.infer<typeof typeformThemeScreensSchema>;
export type WelcomeScreen = z.infer<typeof welcomeScreenSchema>;
export type ThankyouScreen = z.infer<typeof thankyouScreenSchema>;
export type Ending = ThankyouScreen;

// --- Declarative Logic Engine types ----------------------------------------

export type LogicRule = z.infer<typeof logicRuleSchema>;
export type LogicAction = z.infer<typeof logicActionSchema>;
export type Condition = z.infer<typeof conditionSchema>;
export type ValueReference = z.infer<typeof valueReferenceSchema>;
export type ScoringRule = z.infer<typeof scoringRuleSchema>;
export type Outcome = z.infer<typeof outcomeSchema>;
export type VariableDefinition = z.infer<typeof variableDefinitionSchema>;
export type CalculationExpression = z.infer<typeof calculationExpressionSchema>;

export type FieldOption = z.infer<typeof choiceSchema>;
export type Attachment = z.infer<typeof attachmentSchema>;
export type Media = Attachment;
export type Layout = z.infer<typeof layoutSchema>;
export type Validations = z.infer<typeof validationsSchema>;
export type Price = z.infer<typeof priceSchema>;

export type { FieldProperties, FormField, Choice } from "./form-schema";

export type FieldValue =
  string | number | boolean | string[] | Record<string, unknown> | null | undefined;

export type FormMode = "conversational" | "classic";

export interface FormSubmission {
  id: string;
  formId?: string;
  status?: string;
  submission_data: Record<string, any>;
  submitted_at: string;
  ip_address?: string | null;
}
