import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { Footer, Navbar } from "@/components/marketing";
import { marketingPlans } from "@/components/marketing/pricing-plans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Pricing — Formyst",
  description: "Simple plans for building, publishing, and understanding better forms.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-32 sm:pt-40">
        <section className="mx-auto max-w-6xl px-4 pb-20 text-center sm:px-6 sm:pb-28">
          <Button
            className="mb-8 gap-2"
            nativeButton={false}
            render={<Link href="/" />}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft className="size-4" />
            Back to home
          </Button>
          <Badge className="rounded-full px-3 py-1" variant="secondary">
            Simple by design
          </Badge>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Start free. Scale when your forms do.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Every plan includes the builder, publishing, and a clear place to read your responses.
            Choose the level of control your workflow needs.
          </p>

          <div className="mt-14 grid gap-6 text-left lg:grid-cols-3">
            {marketingPlans.map((plan) => (
              <article
                className={`relative flex flex-col rounded-2xl border p-7 ${
                  plan.popular
                    ? "border-primary/40 bg-card shadow-xl shadow-primary/10 lg:-translate-y-2"
                    : "border-border/60 bg-card/60"
                }`}
                key={plan.name}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-7 rounded-full px-3">
                    Best for growing teams
                  </Badge>
                )}
                <h2 className="font-semibold text-xl">{plan.name}</h2>
                <p className="mt-3 min-h-12 text-muted-foreground text-sm leading-relaxed">
                  {plan.description}
                </p>
                <div className="mt-7 flex items-baseline gap-2">
                  <span className="font-bold text-5xl tracking-tight">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <Button
                  className="mt-7 w-full"
                  nativeButton={false}
                  render={<Link href="/register" />}
                  size="lg"
                  variant={plan.variant}
                >
                  {plan.cta}
                </Button>
                <ul className="mt-8 space-y-3 border-border/60 border-t pt-7">
                  {plan.features.map((feature) => (
                    <li className="flex items-start gap-2.5 text-sm" key={feature}>
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
