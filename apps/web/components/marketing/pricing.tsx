import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { marketingPlans } from "./pricing-plans";

export function Pricing() {
  return (
    <section id="pricing" className="relative py-20 sm:py-28">
      <div className="absolute inset-0 -z-10 bg-muted/30" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">Pricing</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, transparent <span className="text-muted-foreground">pricing</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Start free, upgrade when you need to. No surprises, no hidden fees.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {marketingPlans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                plan.popular
                  ? "border-primary/30 bg-card shadow-xl shadow-primary/5 scale-[1.02]"
                  : "border-border/50 bg-card hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
              }`}
            >
              {plan.popular && (
                <Badge variant="default" className="absolute -top-3 left-1/2 -translate-x-1/2 px-3">
                  Most Popular
                </Badge>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.variant}
                className="w-full"
                size="lg"
                render={<Link href="/register" />}
                nativeButton={false}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
