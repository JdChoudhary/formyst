import { FormPreview } from "@/components/form-builder/form-preview";
import { toast } from "sonner";

import type { PreviewPanelProps } from "@/lib/ai-builder/types";
import { PreviewPanelHeader } from "./preview-panel-header";

export function PreviewPanel({
	forms,
	activeFormId,
	setActiveFormId,
	router,
	setShowJsonModal,
	activeForm,
	onUseForm,
	isUsingForm,
}: PreviewPanelProps) {
	const handleUseForm = async () => {
		if (!activeForm?.schema || isUsingForm) return;
		try {
			const result = await onUseForm(activeForm);
			if (result?.route) router.push(result.route);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to use this form");
		}
	};

	return (
		<div className="flex h-full min-h-0 flex-1 flex-col gap-4">
			<PreviewPanelHeader
				activeForm={activeForm}
				activeFormId={activeFormId}
				forms={forms}
				isMobile={true}
				isUsingForm={isUsingForm}
				onUseForm={handleUseForm}
				setActiveFormId={setActiveFormId}
				setShowJsonModal={setShowJsonModal}
			/>
			<PreviewPanelHeader
				activeForm={activeForm}
				activeFormId={activeFormId}
				forms={forms}
				isMobile={false}
				isUsingForm={isUsingForm}
				onUseForm={handleUseForm}
				setActiveFormId={setActiveFormId}
				setShowJsonModal={setShowJsonModal}
			/>
			<div className="my-12 min-h-0 flex-1 overflow-auto p-3 md:p-6">
				{activeForm?.schema ? (
					<FormPreview
						interactive
						onFieldDelete={() => {}}
						onFieldSelect={() => {}}
						onFieldsReorder={() => {}}
						schema={activeForm.schema}
						selectedFieldId={null}
					/>
				) : (
					<div className="flex items-center justify-center text-center text-muted-foreground">
						No form selected.
					</div>
				)}
			</div>
		</div>
	);
}
