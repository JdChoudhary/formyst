import type React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Modal,
	ModalContent,
	ModalHeader,
	ModalTitle,
} from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { FormSettingsModal } from "../../form-settings-modal";
import { JsonViewModal } from "../../modals/json-view-modal";
import { ShareFormModal } from "../../modals/share-form-modal";

import type { FormBuilderModalsProps } from "../types";

export const FormBuilderModals: React.FC<FormBuilderModalsProps> = ({
	showSettings,
	showFormSettings,
	showJsonView,
	showShareModal,
	formSchema,
	formId,
	formSlug,
	isPublished,
	onCloseSettings,
	onCloseFormSettings,
	onCloseJsonView,
	onCloseShareModal,
	onFormSettingsUpdate,
	onSchemaUpdate,
	onPublish,
	userEmail,
}) => {
	return (
	<>
		{}
		<Modal onOpenChange={onCloseSettings} open={showSettings}>
			<ModalContent className="flex flex-col gap-6 bg-card text-card-foreground max-sm:p-4">
				<ModalHeader>
					<ModalTitle>Form Settings</ModalTitle>
				</ModalHeader>
				<div className="flex flex-col gap-6">
					<div className="flex flex-col gap-4">
						<div className="flex flex-col gap-1">
							<Label htmlFor="form-title">Title</Label>
							<Input
								id="form-title"
								onChange={(e) =>
									onSchemaUpdate({
										title: e.target.value,
										settings: {
											meta: {
												...formSchema.settings?.meta,
												title: e.target.value,
											},
										},
									})
								}
								placeholder="Enter a title for your form..."
								value={formSchema.title || ""}
							/>
						</div>

						<div className="flex flex-col gap-1">
							<Label htmlFor="form-description">Description</Label>
							<Textarea
								id="form-description"
								onChange={(e) =>
									onSchemaUpdate({
										settings: {
											meta: {
												...formSchema.settings?.meta,
												description: e.target.value,
											},
										},
									})
								}
								placeholder="Enter form description"
								rows={3}
								value={formSchema.settings?.meta?.description || ""}
							/>
						</div>

						<div className="flex flex-col gap-1">
							<Label htmlFor="success-message">Success Message</Label>
							<Textarea
								id="success-message"
								onChange={(e) =>
									onSchemaUpdate({
										thankyou_screens: [
											{
												...(formSchema.thankyou_screens?.[0] ?? {
													type: "thankyou_screen" as const,
												}),
												title: e.target.value,
											},
											...(formSchema.thankyou_screens?.slice(1) ?? []),
										],
									})
								}
								placeholder="Message shown after successful submission"
								rows={2}
								value={formSchema.thankyou_screens?.[0]?.title || ""}
							/>
						</div>

						<div className="flex flex-col gap-1">
							<Label htmlFor="redirect-url">Redirect URL (optional)</Label>
							<Input
								id="redirect-url"
								onChange={(e) =>
									onSchemaUpdate({
										settings: { redirect_after_submit_url: e.target.value },
									})
								}
								placeholder="https://example.com/thank-you"
								value={formSchema.settings?.redirect_after_submit_url || ""}
							/>
						</div>
					</div>

					<div className="flex justify-end gap-2">
						<Button onClick={onCloseSettings} variant="secondary">
							Cancel
						</Button>
						<Button onClick={onCloseSettings}>Save Settings</Button>
					</div>
				</div>
			</ModalContent>
		</Modal>

		{}
		<JsonViewModal
			isOpen={showJsonView}
			onClose={onCloseJsonView}
			schema={formSchema}
		/>

		{}
		<FormSettingsModal
			formId={formId}
			isOpen={showFormSettings}
			onClose={onCloseFormSettings}
			onSchemaUpdate={onSchemaUpdate}
			schema={formSchema}
			userEmail={userEmail}
		/>

		{}
		<ShareFormModal
			formId={formId ?? null}
			formSlug={formSlug ?? null}
			isOpen={showShareModal}
			isPublished={isPublished}
			onClose={onCloseShareModal}
			onPublish={onPublish}
		/>
	</>
	);
};
