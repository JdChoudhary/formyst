import type { Metadata } from "next";
import { ThemesPageClient } from "./themes-client";

export const metadata: Metadata = {
  title: "Themes",
  description: "Create and manage form themes for your workspace.",
};

export default function ThemesPage() {
  return <ThemesPageClient />;
}
