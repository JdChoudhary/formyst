import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

import type { BotProtectionSectionProps } from "../types";

export function BotProtectionSection({
	localSettings,
	updateBotProtection,
	formId,
	schema,
	onSchemaUpdate,
}: BotProtectionSectionProps & {
	onSchemaUpdate?: (updates: Partial<any>) => void;
}) {
	const [botProtectionSettings, setBotProtectionSettings] = useState({
		enabled: localSettings.botProtection?.enabled,
		message: localSettings.botProtection?.message || "",
	});

	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [hasChanges, setHasChanges] = useState(false);

	const botProtectionRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const onBeforeUnload = (e: BeforeUnloadEvent) => {
			if (hasChanges) {
				e.preventDefault();
				e.returnValue = "";
			}
		};
		window.addEventListener("beforeunload", onBeforeUnload);
		return () =>
			window.removeEventListener(
				"beforeunload",
				onBeforeUnload as unknown as EventListener
			);
	}, [hasChanges]);

	const handleBotProtectionChange = (field: string, value: any) => {
		setBotProtectionSettings((prev) => ({ ...prev, [field]: value }));
		setSaved(false);
		setHasChanges(true);
	};

	const resetSettings = () => {
		setBotProtectionSettings({
			enabled: localSettings.botProtection?.enabled,
			message: localSettings.botProtection?.message || "",
		});
		setHasChanges(false);
	};

	const saveBotProtection = async () => {
		if (!formId) {
			toast.error("Form ID is required to save settings");
			return;
		}

		setSaving(true);
		try {
			const trimmed = {
				enabled: botProtectionSettings.enabled,
				message: (botProtectionSettings.message || "").trim(),
			};
			if (onSchemaUpdate) {
				await onSchemaUpdate({
					settings: {
						...schema.settings,
						botProtection: trimmed,
					},
				});
			}
			updateBotProtection(trimmed);
			setSaved(true);
			setHasChanges(false);
			toast.success("Bot detection settings saved successfully");

			setTimeout(() => setSaved(false), 2000);
		} catch (error) {
			console.error("Error saving bot detection:", error);
			toast.error("Failed to save bot detection settings");
		} finally {
			setSaving(false);
		}
	};

	useEffect(() => {
		if (botProtectionRef.current) {
			const firstInput = botProtectionRef.current.querySelector(
				"input, textarea"
			) as HTMLElement;
			firstInput?.focus();
		}
	}, []);

	useEffect(() => {
		if (saved) {
			const announcement = document.createElement("div");
			announcement.setAttribute("aria-live", "polite");
			announcement.setAttribute("aria-atomic", "true");
			announcement.className = "sr-only";
			announcement.textContent = "Bot detection settings saved successfully";
			document.body.appendChild(announcement);

			setTimeout(() => {
				document.body.removeChild(announcement);
			}, 1000);
		}
	}, [saved]);

	return (
		<div
			aria-label="Bot detection settings"
			className="flex flex-col gap-4"
			onKeyDown={(e) => {
				const target = e.target as HTMLElement;
				const isTextarea = target.tagName === "TEXTAREA";
				if (isTextarea && e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
					e.preventDefault();
					saveBotProtection();
				}
			}}
			role="main"
			style={{
				overscrollBehavior: "contain",
			}}
		>
			<Card
				aria-labelledby="bot-protection-title"
				className="shadow-none"
				ref={botProtectionRef}
				role="region"
			>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle
								className="flex items-center gap-2 text-lg tracking-tight"
								id="bot-protection-title"
							>
								Bot Detection (Honeypot){" "}
								{hasChanges && (
									<Badge className="gap-2" variant="secondary">
										<div className="size-2 rounded-full bg-orange-500" />
										Unsaved changes
									</Badge>
								)}
							</CardTitle>
							<CardDescription id="bot-protection-description">
								Block automated submissions with a hidden honeypot field
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="flex flex-col gap-6">
					<div className="flex items-center justify-between">
						<div className="flex flex-col gap-1">
							<Label
								className="font-medium text-sm"
								htmlFor="bot-protection-enabled"
							>
								Enable Bot Detection (Honeypot)
							</Label>
							<p
								className="text-muted-foreground text-xs"
								id="bot-protection-enabled-description"
							>
								Blocks bots that fill hidden fields. Legitimate users won&apos;t
								see it.
							</p>
						</div>
						<Switch
							aria-describedby="bot-protection-enabled-description"
							checked={botProtectionSettings.enabled}
							id="bot-protection-enabled"
							onCheckedChange={(checked) =>
								handleBotProtectionChange("enabled", checked)
							}
						/>
					</div>

					{botProtectionSettings.enabled && (
						<div className="flex flex-col gap-6">
							<div className="flex flex-col gap-4">
								<div className="flex flex-col gap-2">
									<Label className="font-medium text-sm" htmlFor="bot-message">
										Bot Rejection Message
									</Label>
									<Textarea
										autoComplete="off"
										className="resize-none shadow-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
										id="bot-message"
										name="bot-message"
										onChange={(e) =>
											handleBotProtectionChange("message", e.target.value)
										}
										onKeyDown={(e) => {
											if (e.key === "Escape") {
												(e.target as HTMLElement).blur();
											}
										}}
										placeholder="Enter a custom message to show when a bot is rejected"
										rows={2}
										value={botProtectionSettings.message}
									/>
									<p className="text-muted-foreground text-xs">
										Shown to respondents when the honeypot field is filled (bot
										detected).
									</p>
								</div>
							</div>

							<div
								aria-live="polite"
								className="rounded-lg border border-muted bg-muted/50 p-4"
								role="status"
							>
								<div className="flex flex-col gap-2">
									<h4 className="font-medium text-foreground text-sm">
										How it works
									</h4>
									<p className="text-muted-foreground text-sm">
										A hidden field is added to the form. Real users don&apos;t see
										or fill it. Bots that auto-fill all fields will trigger it and
										be rejected.
									</p>
								</div>
							</div>
						</div>
					)}

					{!botProtectionSettings.enabled && (
						<div className="rounded-lg bg-muted/30 p-4">
							<p className="text-muted-foreground text-sm">
								Bot detection adds a hidden honeypot field to your form. When a
								bot fills it in, the submission is blocked. No CAPTCHAs or
								external services required.
							</p>
						</div>
					)}

					<div
						aria-label="Bot protection actions"
						className="flex items-center justify-between"
						role="group"
					>
						<div className="flex items-center gap-2">
							{hasChanges && (
								<Button
									className="min-h-10 gap-2 text-muted-foreground hover:text-foreground"
									onClick={resetSettings}
									size="sm"
									variant="ghost"
								>
									Reset
								</Button>
							)}
						</div>
						<div className="flex items-center gap-2">
							<Button
								aria-describedby="bot-protection-description"
								aria-label="Save bot detection settings"
								className="min-h-10"
								disabled={saving || !hasChanges}
								loading={saving}
								onClick={saveBotProtection}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										saveBotProtection();
									}
								}}
							>
								Save
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
