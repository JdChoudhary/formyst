/**
 * Database-facing types used by admin pages.
 *
 * The canonical definitions live in `@repo/shared`; this module exists only as
 * a stable local path so admin code doesn't reach across packages for types.
 */
export type {
  FormSchema,
  FormField,
  FormSettings,
  ThankyouScreen,
  WelcomeScreen,
  Theme,
} from "@repo/shared";
