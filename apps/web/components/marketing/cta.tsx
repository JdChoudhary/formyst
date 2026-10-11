import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-foreground px-6 py-16 text-center sm:px-12 sm:py-20">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 size-64 translate-x-1/2 translate-y-1/2 rounded-full bg-primary/20 blur-3xl" />

          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight text-background sm:text-4xl">
              Ready to build your first form?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-background/70">
              Create a polished first form in minutes. Start free, then add more control as your
              workflow grows.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                className="h-12 bg-background px-6 text-foreground hover:bg-background/90"
                render={<Link href="/register" />}
                nativeButton={false}
              >
                Get Started Free
                <ArrowRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 border-background/20 px-6 text-background hover:bg-background/10 hover:text-background"
                render={<Link href="#features" />}
                nativeButton={false}
              >
                Explore Features
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
