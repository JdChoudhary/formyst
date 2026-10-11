"use client";

import { CloudOff, CloudUpload, Loader2, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AutosaveStatusProps {
	saving: boolean;
	error: string | null;
	offline?: boolean;
	onSaveNow?: () => void;
	className?: string;
}

/**
 * Inline autosave indicator + manual "Save now" button.
 * States: saving → saved → offline (local only) / error (retrying).
 */
export function AutosaveStatus({
	saving,
	error,
	offline,
	onSaveNow,
	className,
}: AutosaveStatusProps) {
	let label = "All changes saved";
	let Icon = CloudUpload;
	let color = "text-emerald-600";

	if (saving) {
		label = "Saving…";
		Icon = Loader2;
		color = "text-muted-foreground";
	} else if (error) {
		label = "Save failed — will retry";
		Icon = RefreshCw;
		color = "text-destructive";
	} else if (offline) {
		label = "Saved on this device — syncs when online";
		Icon = CloudOff;
		color = "text-amber-600";
	}

	return (
		<div className={cn("flex items-center justify-end gap-3", className)}>
			<div
				aria-live="polite"
				className="flex items-center gap-1.5 text-xs"
			>
				<Icon
					className={cn(
						"size-3.5 shrink-0",
						saving && "animate-spin",
						color
					)}
				/>
				<span className={cn("font-medium", color)}>{label}</span>
			</div>
			{onSaveNow && (
				<Button
					className="h-8 gap-1.5 px-3 text-xs"
					disabled={saving}
					onClick={onSaveNow}
					size="sm"
					type="button"
					variant="outline"
				>
					<Save className="size-3.5" />
					Save now
				</Button>
			)}
		</div>
	);
}
