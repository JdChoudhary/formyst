"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmationModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	confirmText?: string;
	cancelText?: string;
	variant?: "default" | "destructive";
	onConfirm: () => void | Promise<void>;
}

/**
 * Generic confirmation dialog (delete form, publish, etc.).
 * Shows a pending state while onConfirm runs.
 */
export function ConfirmationModal({
	open,
	onOpenChange,
	title,
	description,
	confirmText = "Confirm",
	cancelText = "Cancel",
	variant = "default",
	onConfirm,
}: ConfirmationModalProps) {
	const [confirming, setConfirming] = React.useState(false);

	const handleConfirm = async () => {
		setConfirming(true);
		try {
			await onConfirm();
		} finally {
			setConfirming(false);
		}
	};

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description && (
						<DialogDescription>{description}</DialogDescription>
					)}
				</DialogHeader>
				<DialogFooter>
					<Button
						disabled={confirming}
						onClick={() => onOpenChange(false)}
						variant="outline"
					>
						{cancelText}
					</Button>
					<Button
						disabled={confirming}
						loading={confirming}
						onClick={handleConfirm}
						variant={variant === "destructive" ? "destructive" : "default"}
					>
						{confirmText}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
