import type { FormProgress, ProgressStorageAdapter } from "../types";

export class LocalStorageAdapter implements ProgressStorageAdapter {
	private prefix = "ikiform_progress_";

	async save(key: string, data: FormProgress): Promise<void> {
		try {
			const serialized = JSON.stringify(data);
			localStorage.setItem(`${this.prefix}${key}`, serialized);
		} catch (error) {
			throw new Error(`Failed to save progress to localStorage: ${error}`);
		}
	}

	async load(key: string): Promise<FormProgress | null> {
		try {
			const stored = localStorage.getItem(`${this.prefix}${key}`);
			if (!stored) return null;

			const data = JSON.parse(stored) as FormProgress;

			if (new Date() > new Date(data.expiresAt)) {
				await this.delete(key);
				return null;
			}

			return data;
		} catch (error) {
			console.warn(`Failed to load progress from localStorage: ${error}`);
			return null;
		}
	}

	async delete(key: string): Promise<void> {
		try {
			localStorage.removeItem(`${this.prefix}${key}`);
		} catch (error) {
			console.warn(`Failed to delete progress from localStorage: ${error}`);
		}
	}

	async clear(): Promise<void> {
		try {
			const keys = Object.keys(localStorage).filter((key) =>
				key.startsWith(this.prefix)
			);

			keys.forEach((key) => localStorage.removeItem(key));
		} catch (error) {
			console.warn(`Failed to clear progress from localStorage: ${error}`);
		}
	}
}

export class SessionStorageAdapter implements ProgressStorageAdapter {
	private prefix = "ikiform_progress_";

	async save(key: string, data: FormProgress): Promise<void> {
		try {
			const serialized = JSON.stringify(data);
			sessionStorage.setItem(`${this.prefix}${key}`, serialized);
		} catch (error) {
			throw new Error(`Failed to save progress to sessionStorage: ${error}`);
		}
	}

	async load(key: string): Promise<FormProgress | null> {
		try {
			const stored = sessionStorage.getItem(`${this.prefix}${key}`);
			if (!stored) return null;

			const data = JSON.parse(stored) as FormProgress;

			if (new Date() > new Date(data.expiresAt)) {
				await this.delete(key);
				return null;
			}

			return data;
		} catch (error) {
			console.warn(`Failed to load progress from sessionStorage: ${error}`);
			return null;
		}
	}

	async delete(key: string): Promise<void> {
		try {
			sessionStorage.removeItem(`${this.prefix}${key}`);
		} catch (error) {
			console.warn(`Failed to delete progress from sessionStorage: ${error}`);
		}
	}

	async clear(): Promise<void> {
		try {
			const keys = Object.keys(sessionStorage).filter((key) =>
				key.startsWith(this.prefix)
			);

			keys.forEach((key) => sessionStorage.removeItem(key));
		} catch (error) {
			console.warn(`Failed to clear progress from sessionStorage: ${error}`);
		}
	}
}

export class ServerStorageAdapter implements ProgressStorageAdapter {
	private prefix = "ikiform_progress_";
	private local = new LocalStorageAdapter();

	/** Keys are `${formId}_${sessionId}` — split on the first underscore. */
	private parseKey(key: string): { formId: string; sessionId: string } {
		const separator = key.indexOf("_");
		return {
			formId: separator === -1 ? key : key.slice(0, separator),
			sessionId: separator === -1 ? "" : key.slice(separator + 1),
		};
	}

	private async saveLocal(key: string, data: FormProgress, offline: boolean): Promise<void> {
		try {
			localStorage.setItem(
				`${this.prefix}${key}`,
				JSON.stringify({ ...data, offline, events: [] }),
			);
		} catch {
			/* storage full — non-fatal */
		}
	}

	private async loadLocal(key: string): Promise<FormProgress | null> {
		try {
			const stored = localStorage.getItem(`${this.prefix}${key}`);
			if (!stored) return null;

			const data = JSON.parse(stored) as FormProgress;

			if (new Date() > new Date(data.expiresAt)) {
				await this.delete(key);
				return null;
			}

			return data;
		} catch (error) {
			console.warn(`Failed to load cached progress: ${error}`);
			return null;
		}
	}

	/**
	 * Saves to the server (form_response draft) AND mirrors to localStorage.
	 * If the server is unreachable the draft stays cached locally and is
	 * marked offline so the UI can tell the respondent it will sync later.
	 */
	async save(key: string, data: FormProgress): Promise<void> {
		const isOnline = typeof navigator !== "undefined" && navigator.onLine;

		// Reflect the offline state on the SAME object the hook keeps in state,
		// so the AutosaveStatus indicator can react to it.
		data.offline = !isOnline;
		await this.saveLocal(key, data, data.offline);

		try {
			const response = await fetch(`/api/forms/${data.formId}/draft`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					formId: data.formId,
					sessionId: data.sessionId,
					formData: data.formData,
					currentStep: data.currentStep,
					lastFieldId: data.lastFieldId ?? null,
					events: data.events ?? [],
				}),
			});

			if (!response.ok) {
				throw new Error(`Server responded with ${response.status}`);
			}

			data.offline = false;
			await this.saveLocal(key, { ...data, events: [] }, false);
		} catch (error) {
			console.warn(`Failed to save progress to server (kept locally): ${error}`);
			data.offline = true;
			await this.saveLocal(key, { ...data, events: [] }, true);
		}
	}

	/** Prefers the server draft; falls back to the local cache when offline. */
	async load(key: string): Promise<FormProgress | null> {
		try {
			const { formId, sessionId } = this.parseKey(key);
			const response = await fetch(`/api/forms/${formId}/draft/${sessionId}`, {
				headers: { "Content-Type": "application/json" },
			});

			if (response.ok) {
				const row = await response.json();
				if (row?.data) {
					const local = await this.loadLocal(key);
					const progress: FormProgress = {
						id: key,
						formId: row.formId ?? formId,
						sessionId: row.sessionId ?? sessionId,
						formData: row.data,
						currentStep: row.lastStepReached ?? 0,
						totalSteps: 1,
						completionPercentage: row.completionPercentage ?? 0,
						lastFieldId: row.lastFieldId ?? null,
						offline: false,
						lastUpdated: new Date(row.lastActivityAt ?? Date.now()),
						expiresAt:
							local?.expiresAt ??
							new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
					};
					await this.saveLocal(key, progress, false);
					return progress;
				}
			}

			return await this.loadLocal(key);
		} catch (error) {
			console.warn(`Failed to load progress from server: ${error}`);
			return await this.loadLocal(key);
		}
	}

	async delete(key: string): Promise<void> {
		try {
			localStorage.removeItem(`${this.prefix}${key}`);
		} catch (error) {
			console.warn(`Failed to delete cached progress: ${error}`);
		}

		try {
			const { formId, sessionId } = this.parseKey(key);
			await fetch(`/api/forms/${formId}/draft/${sessionId}`, {
				method: "DELETE",
			});
		} catch (error) {
			console.warn(`Failed to delete progress from server: ${error}`);
		}
	}

	async clear(): Promise<void> {
		try {
			const keys = Object.keys(localStorage).filter((k) =>
				k.startsWith(this.prefix),
			);
			keys.forEach((k) => localStorage.removeItem(k));
		} catch (error) {
			console.warn(`Failed to clear progress: ${error}`);
		}
	}
}
