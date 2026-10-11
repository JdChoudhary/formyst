import { CreditCard, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BaseFieldProps } from "../types";

function formatAmount(currency: string, amount: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: currency || "USD",
		minimumFractionDigits: 2,
	}).format(amount);
}

/**
 * Payment — simulated intent, provider-ready.
 *
 * Captures { provider, currency, amount, variable, mode, paid, paidAt } into
 * the response data so the amount & processor are recorded end-to-end without
 * any API keys. Swap `handlePay` for a real Stripe/PayPal Checkout call later
 * without touching the schema or renderers.
 */
export function PaymentField({
	field,
	value,
	onChange,
	disabled,
	fieldRef,
}: BaseFieldProps) {
	if (field.type !== "payment") return null;

	const settings = (field.properties ?? {}) as Record<string, any>;
	const provider = settings.provider ?? "stripe";
	const currency = settings.currency ?? "USD";
	const amountMode = settings.price?.type ?? "fixed";
	const amountCents = settings.price?.value?.amount;
	const parsedAmount =
		typeof amountCents === "string" && amountCents.trim() !== ""
			? Number(amountCents) / 100
			: typeof amountCents === "number"
				? amountCents / 100
				: undefined;
	const isPaid = Boolean(value?.paid);

	const amountLabel =
		amountMode === "fixed" && typeof parsedAmount === "number"
			? formatAmount(currency, parsedAmount)
			: amountMode === "fixed"
				? "—" // fixed but no amount configured yet
				: amountMode === "variable"
					? "Variable amount"
					: "Calculated amount";

	const handlePay = () => {
		onChange({
			provider,
			currency,
			amount: amountMode === "fixed" ? parsedAmount : undefined,
			variable: amountMode === "variable" ? settings.price?.value?.variable_ref : undefined,
			mode: amountMode,
			paid: true,
			paidAt: new Date().toISOString(),
		});
	};

	return (
		<div
			className="flex flex-col gap-3 rounded-xl border border-border p-4"
			ref={fieldRef}
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<CreditCard className="size-5 text-muted-foreground" />
					<span className="text-sm font-medium">
						Payment via {provider === "paypal" ? "PayPal" : "Stripe"}
					</span>
				</div>
				<span className="text-lg font-semibold">{amountLabel}</span>
			</div>

			{amountMode === "variable" && settings.price?.value?.variable_ref && (
				<p className="text-xs text-muted-foreground">
					Amount is taken from the “{settings.price?.value?.variable_ref}” field.
				</p>
			)}

			<Button
				className={cn("w-full", disabled && "pointer-events-none opacity-50")}
				disabled={disabled}
				onClick={handlePay}
				type="button"
				variant={isPaid ? "outline" : "default"}
			>
				{isPaid ? (
					<>
						<Receipt className="size-4" />
						✓ Payment recorded — {amountLabel}
					</>
				) : (
					`Pay with ${provider === "paypal" ? "PayPal" : "Stripe"}`
				)}
			</Button>
			<p className="text-xs text-muted-foreground">
				{isPaid
					? "This demo records the payment intent without charging a card."
					: "Simulated checkout — no real payment is processed."}
			</p>
		</div>
	);
}
