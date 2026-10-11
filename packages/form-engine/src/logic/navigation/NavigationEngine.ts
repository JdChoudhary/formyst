/**
 * Navigation Engine
 *
 * Treats the form as a directed graph rather than a simple array.
 * Handles next/previous/jump/skip navigation, visibility evaluation,
 * and conditional branching.
 *
 * The form definition remains ordered, but runtime navigation is a graph.
 */

import type {
  FormRuntimeState,
  EvaluationResult,
} from "../../types";

// ---------------------------------------------------------------------------
// Navigation context
// ---------------------------------------------------------------------------

export interface NavigationContext {
  /** All field refs in definition order */
  fieldRefs: string[];
  /** All group refs in definition order */
  groupRefs: string[];
  /** Fields belonging to each group: groupRef → fieldRefs[] */
  groupFields: Record<string, string[]>;
  /** Current runtime state */
  state: FormRuntimeState;
}

// ---------------------------------------------------------------------------
// Navigation result
// ---------------------------------------------------------------------------

export interface NavigationResult {
  /** The next field ref to navigate to */
  nextFieldRef?: string;
  /** The next group ref to navigate to */
  nextGroupRef?: string;
  /** Whether we've reached the end */
  isEnd: boolean;
  /** Should show thankyou screen */
  showThankyou: boolean;
  /** Thankyou screen ref */
  thankyouRef?: string;
}

// ---------------------------------------------------------------------------
// Navigation Engine
// ---------------------------------------------------------------------------

export class NavigationEngine {
  private ctx: NavigationContext;

  constructor(ctx: NavigationContext) {
    this.ctx = ctx;
  }

  /**
   * Update the navigation context (e.g., after state changes).
   */
  updateContext(ctx: NavigationContext): void {
    this.ctx = ctx;
  }

  /**
   * Get the next visible field after the current one.
   */
  getNextField(
    currentFieldRef: string,
    skipRefs: string[] = [],
    hiddenRefs: string[] = [],
  ): NavigationResult {
    const allRefs = this.ctx.fieldRefs;
    const skipSet = new Set(skipRefs);
    const hiddenSet = new Set(hiddenRefs);
    const visibility = this.ctx.state.visibility;

    const currentIndex = allRefs.indexOf(currentFieldRef);

    // Search forward from current position
    for (let i = currentIndex + 1; i < allRefs.length; i++) {
      const ref = allRefs[i];
      if (ref === undefined) continue;

      // Skip if explicitly skipped
      if (skipSet.has(ref)) continue;

      // Skip if hidden by visibility rules
      if (visibility[ref] === false) continue;

      // Skip if in a hidden group
      const groupRef = this.findGroupForField(ref);
      if (groupRef && (hiddenSet.has(groupRef) || visibility[groupRef] === false)) {
        continue;
      }

      return {
        nextFieldRef: ref,
        nextGroupRef: groupRef,
        isEnd: false,
        showThankyou: false,
      };
    }

    // No more visible fields — end of form
    return {
      isEnd: true,
      showThankyou: true,
    };
  }

  /**
   * Get the previous visible field before the current one.
   */
  getPreviousField(
    currentFieldRef: string,
    skipRefs: string[] = [],
    hiddenRefs: string[] = [],
  ): NavigationResult {
    const allRefs = this.ctx.fieldRefs;
    const skipSet = new Set(skipRefs);
    const hiddenSet = new Set(hiddenRefs);
    const visibility = this.ctx.state.visibility;

    const currentIndex = allRefs.indexOf(currentFieldRef);

    // Search backward from current position
    for (let i = currentIndex - 1; i >= 0; i--) {
      const ref = allRefs[i];
      if (ref === undefined) continue;

      // Skip if explicitly skipped
      if (skipSet.has(ref)) continue;

      // Skip if hidden
      if (visibility[ref] === false) continue;

      // Skip if in a hidden group
      const groupRef = this.findGroupForField(ref);
      if (groupRef && (hiddenSet.has(groupRef) || visibility[groupRef] === false)) {
        continue;
      }

      return {
        nextFieldRef: ref,
        nextGroupRef: groupRef,
        isEnd: false,
        showThankyou: false,
      };
    }

    // At the beginning
    return {
      nextFieldRef: undefined,
      isEnd: false,
      showThankyou: false,
    };
  }

  /**
   * Jump to a specific field or group.
   */
  jumpTo(
    targetRef: string,
    targetType: "field" | "group" | "thankyou",
    skipRefs: string[] = [],
    hiddenRefs: string[] = [],
  ): NavigationResult {
    if (targetType === "thankyou") {
      return {
        isEnd: true,
        showThankyou: true,
        thankyouRef: targetRef,
      };
    }

    if (targetType === "group") {
      // Find the first visible field in the group
      const groupFields = this.ctx.groupFields[targetRef] ?? [];
      const skipSet = new Set(skipRefs);
      const hiddenSet = new Set(hiddenRefs);
      const visibility = this.ctx.state.visibility;

      for (const fieldRef of groupFields) {
        if (skipSet.has(fieldRef)) continue;
        if (visibility[fieldRef] === false) continue;
        if (hiddenSet.has(targetRef) || visibility[targetRef] === false) continue;

        return {
          nextFieldRef: fieldRef,
          nextGroupRef: targetRef,
          isEnd: false,
          showThankyou: false,
        };
      }

      // No visible fields in group — try next group
      return this.getNextGroup(targetRef, skipRefs, hiddenRefs);
    }

    // Jump to field
    if (this.ctx.fieldRefs.includes(targetRef)) {
      const groupRef = this.findGroupForField(targetRef);
      return {
        nextFieldRef: targetRef,
        nextGroupRef: groupRef,
        isEnd: false,
        showThankyou: false,
      };
    }

    // Target not found — try as thankyou ref
    return {
      isEnd: true,
      showThankyou: true,
      thankyouRef: targetRef,
    };
  }

  /**
   * Get the next group after the current one.
   */
  getNextGroup(
    currentGroupRef: string,
    skipRefs: string[] = [],
    hiddenRefs: string[] = [],
  ): NavigationResult {
    const allGroupRefs = this.ctx.groupRefs;
    const skipSet = new Set(skipRefs);
    const hiddenSet = new Set(hiddenRefs);
    const visibility = this.ctx.state.visibility;

    const currentIndex = allGroupRefs.indexOf(currentGroupRef);

    for (let i = currentIndex + 1; i < allGroupRefs.length; i++) {
      const groupRef = allGroupRefs[i];
      if (groupRef === undefined) continue;

      if (skipSet.has(groupRef)) continue;
      if (hiddenSet.has(groupRef) || visibility[groupRef] === false) continue;

      // Find first visible field in this group
      const groupFields = this.ctx.groupFields[groupRef] ?? [];
      for (const fieldRef of groupFields) {
        if (skipSet.has(fieldRef)) continue;
        if (visibility[fieldRef] === false) continue;

        return {
          nextFieldRef: fieldRef,
          nextGroupRef: groupRef,
          isEnd: false,
          showThankyou: false,
        };
      }
    }

    return {
      isEnd: true,
      showThankyou: true,
    };
  }

  /**
   * Find which group a field belongs to.
   */
  private findGroupForField(fieldRef: string): string | undefined {
    for (const [groupRef, fields] of Object.entries(this.ctx.groupFields)) {
      if (fields.includes(fieldRef)) {
        return groupRef;
      }
    }
    return undefined;
  }

  /**
   * Get all visible field refs in order.
   */
  getVisibleFieldRefs(
    skipRefs: string[] = [],
    hiddenRefs: string[] = [],
  ): string[] {
    const allRefs = this.ctx.fieldRefs;
    const skipSet = new Set(skipRefs);
    const hiddenSet = new Set(hiddenRefs);
    const visibility = this.ctx.state.visibility;

    return allRefs.filter((ref) => {
      if (skipSet.has(ref)) return false;
      if (visibility[ref] === false) return false;

      const groupRef = this.findGroupForField(ref);
      if (groupRef && (hiddenSet.has(groupRef) || visibility[groupRef] === false)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Check if a field is reachable (not permanently skipped).
   */
  isFieldReachable(
    fieldRef: string,
    skipRefs: string[] = [],
    hiddenRefs: string[] = [],
  ): boolean {
    const skipSet = new Set(skipRefs);
    const hiddenSet = new Set(hiddenRefs);
    const visibility = this.ctx.state.visibility;

    if (skipSet.has(fieldRef)) return false;
    if (visibility[fieldRef] === false) return false;

    const groupRef = this.findGroupForField(fieldRef);
    if (groupRef && (hiddenSet.has(groupRef) || visibility[groupRef] === false)) {
      return false;
    }

    return true;
  }
}
