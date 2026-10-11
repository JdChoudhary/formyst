/**
 * @repo/form-engine
 *
 * Declarative logic and branching engine for Typeform-like form builders.
 *
 * Architecture:
 *   Form Definition
 *          │
 *          ▼
 *   Logic Engine
 *          │
 *   ┌──────┼──────┐
 *   ▼      ▼      ▼
 *  Rules  Scoring  Outcomes
 *   │      │      │
 *   └──────┼──────┘
 *          ▼
 *   Runtime State Changes
 *
 * The engine does NOT mutate the original form schema.
 * It returns state changes that the renderer applies.
 */

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

export type {
  ValueReference,
  ComparisonOperator,
  Condition,
  ActionTarget,
  LogicAction,
  LogicTrigger,
  LogicRule,
  ScoringRule,
  Outcome,
  VariableDefinition,
  CalculationOperand,
  CalculationOperator,
  CalculationExpression,
  FormRuntimeState,
  EvaluationResult,
  LogicEngineConfig,
} from "./types";

export {
  OPERATOR_GROUPS,
} from "./types";

// ---------------------------------------------------------------------------
// Condition system
// ---------------------------------------------------------------------------

export {
  evaluateCondition,
  convertLegacyCondition,
} from "./logic/conditions/evaluateCondition";
export type { ConditionContext } from "./logic/conditions/evaluateCondition";

export {
  resolveValue,
  asNumber,
  asString,
  asDate,
  asBoolean,
  isEmpty,
} from "./logic/conditions/valueResolver";

export {
  evaluateOperator,
  isValidOperatorForFieldType,
  getValidOperatorsForFieldType,
  OPERATORS_BY_CATEGORY,
  FIELD_TYPE_OPERATORS,
} from "./logic/conditions/operators";
export type { OperatorCategory } from "./logic/conditions/operators";

// ---------------------------------------------------------------------------
// Action system
// ---------------------------------------------------------------------------

export {
  executeAction,
  executeActions,
} from "./logic/actions/executeAction";
export type { ActionContext } from "./logic/actions/executeAction";

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export {
  LogicEngine,
  createLogicEngine,
} from "./logic/engine/LogicEngine";

export {
  evaluateExpression,
  evaluateCalculation,
} from "./logic/engine/expressionEvaluator";

export {
  generateRuleSummary,
  generateConditionSummary,
  generateActionSummary,
} from "./logic/engine/logicSummary";

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

export {
  NavigationEngine,
} from "./logic/navigation/NavigationEngine";
export type {
  NavigationContext,
  NavigationResult,
} from "./logic/navigation/NavigationEngine";

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export {
  ScoringEngine,
} from "./logic/scoring/ScoringEngine";
export type {
  ScoringResult,
  FieldScore,
} from "./logic/scoring/ScoringEngine";

// ---------------------------------------------------------------------------
// Outcomes
// ---------------------------------------------------------------------------

export {
  OutcomeEngine,
} from "./logic/outcomes/OutcomeEngine";
export type {
  OutcomeResult,
} from "./logic/outcomes/OutcomeEngine";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export {
  validateLogic,
} from "./logic/validation/validateLogic";
export type {
  ValidationError,
  ValidationResult,
} from "./logic/validation/validateLogic";

// ---------------------------------------------------------------------------
// Runtime
// ---------------------------------------------------------------------------

export {
  FormRuntime,
  createFormRuntime,
} from "./runtime/FormRuntime";

// ---------------------------------------------------------------------------
// Recall Information / Piping
// ---------------------------------------------------------------------------

export {
  RecallEngine,
} from "./recall/RecallEngine";

export type {
  RecallReference,
  TextSegment,
  RecallSource,
  RecallContext,
  RecallWarning,
  RecallFormDef,
} from "./recall/RecallEngine";
