import { cn } from "@/lib/utils";
import type { BaseFieldProps } from "../types";

/**
 * Statement — a display-only section (heading + description). Reads the new
 * field shape: title + properties.description / button_text.
 */
export function StatementField({ field }: BaseFieldProps) {
	if (field.type !== "statement") return null;

	const heading = field.title;
	const description = field.properties?.description;

	const headingId = `${field.ref ?? "field"}-statement-heading`;

	return (
		<section
			aria-label={heading ? undefined : "Statement"}
			aria-labelledby={heading ? headingId : undefined}
			className="flex flex-col gap-2"
			role="group"
		>
			{heading && (
				<h3 className="font-semibold text-foreground text-xl" id={headingId}>
					{heading}
				</h3>
			)}
			{description && (
				<p className="max-w-prose text-muted-foreground text-sm">
					{description}
				</p>
			)}
		</section>
	);
}
