"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { listUserEmailsAction, sendAnnouncementAction } from "./actions";

export function ClientAnnouncementForm() {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const toRef = useRef<HTMLTextAreaElement | null>(null);

	const handlePrefill = async () => {
		if (!toRef.current) {
			return;
		}
		setIsSubmitting(true);
		try {
			const emails = await listUserEmailsAction();
			toRef.current.value = emails.join(", ");
			toast.success(`Loaded ${emails.length} email(s)`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to load emails");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleSubmit = async (formData: FormData) => {
		setIsSubmitting(true);
		const promise = sendAnnouncementAction(formData);
		toast.promise(promise, {
			loading: "Sending announcements...",
			success: (res) => (res.ok ? `Sent ${res.sent} email(s)` : `Failed: ${res.error}`),
			error: (e) => (e instanceof Error ? e.message : "Failed to send"),
		});
		await promise;
		setIsSubmitting(false);
	};

	return (
		<form
			className="grid gap-4"
			onSubmit={async (e) => {
				e.preventDefault();
				await handleSubmit(new FormData(e.currentTarget));
			}}
		>
			<div className="grid gap-2">
				<Label htmlFor="to">Recipient emails</Label>
				<Textarea
					id="to"
					name="to"
					placeholder={"one@example.com, two@example.com\nor\nthree@example.com"}
					ref={toRef}
					required
					rows={4}
				/>
				<div className="flex items-center justify-between">
					<p className="text-muted-foreground text-xs">Comma- or newline-separated.</p>
					<Button
						disabled={isSubmitting}
						onClick={handlePrefill}
						type="button"
						variant="ghost"
					>
						{isSubmitting ? "Loading..." : "Prefill from users"}
					</Button>
				</div>
			</div>

			<div className="grid gap-2">
				<Label htmlFor="subject">Subject</Label>
				<Input id="subject" name="subject" placeholder="Announcement subject" required />
			</div>

			<div className="grid gap-2">
				<Label htmlFor="content">Content</Label>
				<Textarea
					id="content"
					name="content"
					placeholder={"# Title\n\nDetails here..."}
					required
					rows={10}
				/>
			</div>

			<div className="flex justify-end">
				<Button disabled={isSubmitting} loading={isSubmitting} type="submit">
					Send Announcement
				</Button>
			</div>
		</form>
	);
}
