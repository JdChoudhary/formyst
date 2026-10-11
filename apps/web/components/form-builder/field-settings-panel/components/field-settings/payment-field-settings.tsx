import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { FieldSettingsProps } from "./types";

export function PaymentFieldSettings({ field, onUpdateSettings }: FieldSettingsProps) {
	const price = field.properties?.price;
	const amountCents = price?.value?.amount;
	const amountDollars =
		typeof amountCents === "string" && amountCents.trim() !== ""
			? String(Number(amountCents) / 100)
			: "";

	const setPrice = (updates: Partial<NonNullable<typeof price>>) => {
		onUpdateSettings({
			price: {
				type: "fixed",
				value: { type: "constant", amount: "" },
				...price,
				...updates,
			},
		});
	};

	return (
		<Card className="gap-2 p-4 shadow-none">
			<CardHeader className="p-0">
				<CardTitle className="flex items-center gap-2 text-lg">
					Payment Settings
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 p-0">
				<div className="flex flex-col gap-2">
					<Label className="font-medium text-sm" htmlFor="payment-provider">
						Payment Provider
					</Label>
					<Select
						onValueChange={(value) =>
							onUpdateSettings({ provider: value as "stripe" | "paypal" })
						}
						value={(field.properties as any)?.provider || "stripe"}
					>
						<SelectTrigger className="w-full" id="payment-provider">
							<SelectValue placeholder="Select provider" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="stripe">Stripe</SelectItem>
							<SelectItem value="paypal">PayPal</SelectItem>
						</SelectContent>
					</Select>
					<p className="text-muted-foreground text-xs" id="payment-provider-help">
						Choose your payment processor
					</p>
				</div>

				<div className="flex flex-col gap-2">
					<Label className="font-medium text-sm" htmlFor="payment-currency">
						Currency
					</Label>
					<Select
						onValueChange={(value) => onUpdateSettings({ currency: value as any })}
						value={field.properties?.currency || "USD"}
					>
						<SelectTrigger className="w-full" id="payment-currency">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="USD">USD — US Dollar</SelectItem>
							<SelectItem value="EUR">EUR — Euro</SelectItem>
							<SelectItem value="GBP">GBP — British Pound</SelectItem>
							<SelectItem value="AUD">AUD — Australian Dollar</SelectItem>
							<SelectItem value="CAD">CAD — Canadian Dollar</SelectItem>
						</SelectContent>
					</Select>
					<p className="text-muted-foreground text-xs" id="payment-currency-help">
						Currency for the payment
					</p>
				</div>

				<div className="flex flex-col gap-2">
					<Label className="font-medium text-sm" htmlFor="payment-amount-mode">
						Amount Mode
					</Label>
					<Select
						onValueChange={(value) =>
							setPrice({ type: value as "fixed" | "variable" })
						}
						value={price?.type ?? "fixed"}
					>
						<SelectTrigger className="w-full" id="payment-amount-mode">
							<SelectValue placeholder="Select amount mode" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="fixed">Fixed Amount</SelectItem>
							<SelectItem value="variable">Variable Amount</SelectItem>
						</SelectContent>
					</Select>
					<p className="text-muted-foreground text-xs" id="payment-amount-mode-help">
						How the payment amount is determined
					</p>
				</div>

				{price?.type === "fixed" && (
					<div className="flex flex-col gap-2">
						<Label className="font-medium text-sm" htmlFor="payment-amount">
							Amount
						</Label>
						<Input
							aria-describedby="payment-amount-help"
							autoComplete="off"
							id="payment-amount"
							min="0"
							name="payment-amount"
							onChange={(e) => {
								const dollars = Number.parseFloat(e.target.value);
								setPrice({
									value: {
										type: "constant",
										amount:
											Number.isFinite(dollars)
												? String(Math.round(dollars * 100))
												: "",
									},
								});
							}}
							onKeyDown={(e) => {
								if (e.key === "Escape") {
									e.currentTarget.blur();
								}
							}}
							placeholder="0.00"
							step="0.01"
							type="number"
							value={amountDollars}
						/>
						<p className="text-muted-foreground text-xs" id="payment-amount-help">
							Fixed payment amount
						</p>
					</div>
				)}

				{price?.type === "variable" && (
					<div className="flex flex-col gap-2">
						<Label className="font-medium text-sm" htmlFor="payment-variable">
							Variable Field
						</Label>
						<Input
							aria-describedby="payment-variable-help"
							autoComplete="off"
							id="payment-variable"
							name="payment-variable"
							onChange={(e) =>
								setPrice({
									value: {
										type: "variable",
										variable_ref: e.target.value || undefined,
									},
								})
							}
							onKeyDown={(e) => {
								if (e.key === "Escape") {
									e.currentTarget.blur();
								}
							}}
							placeholder="Enter field ref or variable name"
							type="text"
							value={price?.value?.variable_ref || ""}
						/>
						<p className="text-muted-foreground text-xs" id="payment-variable-help">
							Field or variable that contains the payment amount
						</p>
					</div>
				)}

				<div className="flex items-center justify-between">
					<div className="flex flex-col">
						<Label className="font-medium text-sm">Receipt Email</Label>
						<p className="text-muted-foreground text-xs">
							Send receipt to customer email
						</p>
					</div>
					<Switch
						checked={field.properties?.email_receipts ?? false}
						onCheckedChange={(checked) =>
							onUpdateSettings({ email_receipts: checked })
						}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
