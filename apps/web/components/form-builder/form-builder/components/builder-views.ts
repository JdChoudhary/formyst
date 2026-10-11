import { GitBranch, Palette, PenTool, Settings } from "lucide-react";
import type { ComponentType } from "react";
import type { BuilderView } from "../types";

export interface BuilderViewItem {
  id: BuilderView;
  /** Full label — used by the desktop tabs. */
  label: string;
  /** Short label — used by the mobile bottom nav. */
  shortLabel: string;
  icon: ComponentType<{ className?: string }>;
}

/**
 * The four builder sections. Kept in one place so the desktop header tabs and
 * the mobile bottom navigation can never drift apart.
 */
export const BUILDER_VIEWS: BuilderViewItem[] = [
  { id: "build", label: "Build", shortLabel: "Build", icon: PenTool },
  { id: "design", label: "Design", shortLabel: "Design", icon: Palette },
  { id: "logic", label: "Logic", shortLabel: "Logic", icon: GitBranch },
  { id: "settings", label: "Settings", shortLabel: "More", icon: Settings },
];
