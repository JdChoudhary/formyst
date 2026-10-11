import { AlertTriangle, ListChecks } from "lucide-react";
import type React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { FormView, FormSubmissionView } from "@repo/shared";
import { calculateFieldDropoff } from "../utils/analytics";

function getSchemaBlocks(form: FormView): any[] {
	const fields = form.schema.fields || [];
	// `groups` is a UI-only legacy extension — read it loosely; v2 forms just
	// get a single synthesized block.
	const groups = (form.schema as any).groups;
	if (groups?.length) {
		return groups.map((group: any) => ({
			id: group.id,
			title: group.title,
			description: group.description,
			fields: group.fieldIds
				.map((id: string) => fields.find((f) => f.ref === id))
				.filter(Boolean),
		}));
	}
	return fields.length
		? [{ id: "default", title: "Form Fields", description: "", fields }]
		: [];
}

function getStepDropoffCounts(form: FormView, submissions: FormSubmissionView[]) {
	const blocks = getSchemaBlocks(form);
	const dropoffCounts: Record<string, number> = {};
	blocks.forEach((block) => (dropoffCounts[block.id] = 0));

	submissions.forEach((sub) => {
		let reached = false;
		for (const block of blocks) {
	const hasAny = (block.fields || []).some(
		(f: any) =>
			sub.submission_data[f.ref] !== undefined &&
			sub.submission_data[f.ref] !== null &&
			sub.submission_data[f.ref] !== ""
	);
			if (hasAny) {
				dropoffCounts[block.id]++;
				reached = true;
			} else if (reached) {
				break;
			}
		}
	});
	return dropoffCounts;
}

interface DropoffAnalyticsProps {
	form: FormView;
	submissions: FormSubmissionView[];
}

export const DropoffAnalytics: React.FC<DropoffAnalyticsProps> = ({
	form,
	submissions,
}) => {
	const isMultiStep = getSchemaBlocks(form).length > 1;
	const total = submissions.length;
	const fieldDropoff = calculateFieldDropoff(form, submissions);

	return (
		<Card className="p-4 shadow-none md:p-6">
			<CardHeader className="flex items-center gap-4 p-0">
				<div aria-hidden="true" className="rounded-md bg-orange-500/10 p-3">
					<AlertTriangle className="size-6 text-orange-600" />
				</div>
				<div className="flex flex-col gap-1">
					<CardTitle className="font-semibold text-foreground text-lg">
						Drop-off analytics
					</CardTitle>
					<p className="text-muted-foreground text-sm">
						Understand where users drop off in your forms — by step and by
						field.
					</p>
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-8 p-0">
				{isMultiStep && (
					<div className="flex flex-col gap-4 pt-6">
						<h3 className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
							By step
						</h3>
						<StepDropoffTable form={form} submissions={submissions} />
					</div>
				)}

				{fieldDropoff.length > 0 && (
					<div className="flex flex-col gap-4 pt-6">
						<h3 className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
							<ListChecks className="size-4" />
							By field
							<span className="font-normal text-muted-foreground/70">
								(abandoned responses by their last interacted field)
							</span>
						</h3>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>#</TableHead>
									<TableHead>Field</TableHead>
									<TableHead>Reached</TableHead>
									<TableHead>Dropped here</TableHead>
									<TableHead>Drop-off %</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{fieldDropoff.map((stat, idx) => {
									const isWorst =
										fieldDropoff.length > 1 &&
										stat.dropoffRate ===
											Math.max(
												...fieldDropoff.map((s) => s.dropoffRate)
											) &&
										stat.droppedAt > 0;

									return (
										<TableRow key={stat.fieldId}>
											<TableCell className="text-muted-foreground text-sm">
												{idx + 1}
											</TableCell>
											<TableCell className="font-medium">
												{stat.label}
											</TableCell>
											<TableCell>
												<span className="font-semibold tabular-nums">
													{stat.reached}
												</span>
												<span className="text-muted-foreground text-sm">
													{" "}
													of {total}
												</span>
											</TableCell>
											<TableCell>
												{stat.droppedAt > 0 ? (
													<span className="font-semibold tabular-nums text-destructive">
														{stat.droppedAt}
													</span>
												) : (
													<span className="text-muted-foreground">
														—
													</span>
												)}
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-2">
													<span className="font-semibold tabular-nums">
														{stat.dropoffRate}%
													</span>
													<div className="max-w-20 flex-1">
														<div className="h-2 overflow-hidden rounded-full bg-muted">
															<div
																aria-label={`Drop-off bar for ${stat.label}`}
																className={`h-full transition-all duration-300 ${
																	isWorst
																		? "bg-destructive"
																		: "bg-orange-500"
																}`}
																style={{
																	width:
																		stat.dropoffRate > 0
																			? `${stat.dropoffRate}%`
																			: "2px",
																}}
															/>
														</div>
													</div>
												</div>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
						{fieldDropoff.length === 0 && (
							<p className="text-muted-foreground text-sm">
								No fields in this form yet.
							</p>
						)}
					</div>
				)}

				{!isMultiStep && fieldDropoff.length === 0 && (
					<p className="pt-4 text-muted-foreground text-sm">
						Add fields to see field-level drop-off analytics.
					</p>
				)}
			</CardContent>
		</Card>
	);
};

function StepDropoffTable({
	form,
	submissions,
}: {
	form: FormView;
	submissions: FormSubmissionView[];
}) {
	const dropoffCounts = getStepDropoffCounts(form, submissions);
	// Only count sessions that actually started filling (ignores empty drafts).
	const total = submissions.filter((sub) =>
		Object.values(sub.submission_data).some(
			(value) =>
				value !== "" && value !== null && value !== undefined
		)
	).length;

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Step</TableHead>
					<TableHead>Reached</TableHead>
					<TableHead>Drop-off %</TableHead>
					<TableHead>Completion %</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{getSchemaBlocks(form).map((block: any, idx: number) => {
					const reached = dropoffCounts[block.id] || 0;
					const dropoff =
						total > 0 ? 100 - Math.round((reached / total) * 100) : 0;
					const completionRate =
						total > 0 ? Math.round((reached / total) * 100) : 0;

					return (
						<TableRow key={block.id}>
							<TableCell className="font-medium">
								<div className="flex items-center gap-2">
									<div className="flex size-6 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-xs">
										{idx + 1}
									</div>
									{block.label ? block.label : `Step ${idx + 1}`}
								</div>
							</TableCell>
							<TableCell>
								<div className="flex items-center gap-2">
									<span className="font-semibold tabular-nums">
										{reached}
									</span>
									<span className="text-muted-foreground text-sm">
										of {total}
									</span>
								</div>
							</TableCell>
							<TableCell>
								<div className="flex items-center gap-2">
									<span className="font-semibold tabular-nums">
										{dropoff}%
									</span>
									<div className="max-w-20 flex-1">
										<div className="h-2 overflow-hidden rounded-full bg-muted">
											<div
												aria-label={`Drop-off bar for step ${idx + 1}`}
												className="h-full bg-destructive transition-all duration-300"
												style={{
													width:
														dropoff > 0 ? `${dropoff}%` : "2px",
													minWidth:
														dropoff === 0 ? "2px" : undefined,
												}}
											/>
										</div>
									</div>
								</div>
							</TableCell>
							<TableCell>
								<div className="flex items-center gap-2">
									<span className="font-semibold tabular-nums">
										{completionRate}%
									</span>
									<div className="max-w-20 flex-1">
										<div className="h-2 overflow-hidden rounded-full bg-muted">
											<div
												aria-label={`Completion bar for step ${idx + 1}`}
												className="h-full bg-primary transition-all duration-300"
												style={{
													width:
														completionRate > 0
															? `${completionRate}%`
															: "2px",
													minWidth:
														completionRate === 0
															? "2px"
															: undefined,
												}}
											/>
										</div>
									</div>
								</div>
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}
