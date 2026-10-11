import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { FormField } from "@repo/shared";
import { getFieldTypeConfig } from "@/lib/fields/field-config";

interface SettingsPanelHeaderProps {
	onClose: () => void;
	field?: FormField | null;
}

export function SettingsPanelHeader({ onClose, field }: SettingsPanelHeaderProps) {
	const config = field ? getFieldTypeConfig(field.type) : undefined;
	const Icon = config?.icon;

	return (
		<header className="flex flex-col border-border bg-card">
			<div className="flex w-full items-center justify-between gap-3 p-3">
				<div className="flex min-w-0 items-center gap-2.5">
					{Icon && (
						<span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
							<Icon aria-hidden="true" className="size-4 text-muted-foreground" />
						</span>
					)}
					<div className="flex min-w-0 flex-col">
						<span className="truncate text-sm font-semibold text-foreground">
							{config?.label ?? field?.type ?? "Field settings"}
						</span>
						<span className="text-xs text-muted-foreground">
							Question settings
						</span>
					</div>
				</div>
				<Button
					aria-label="Close field settings"
					className="flex gap-2"
					onClick={onClose}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							onClose();
						}
					}}
					size="icon-sm"
					variant="ghost"
				>
					<X aria-hidden="true" className="size-4" />
				</Button>
			</div>
			<Separator />
		</header>
	);
}
