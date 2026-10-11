import { Star } from "lucide-react";

const testimonials = [
  {
    quote:
      "We replaced three different form tools with Formyst. The drag-and-drop editor is genuinely intuitive, and the analytics dashboard saves us hours every week.",
    name: "Sarah Chen",
    role: "Product Lead at Acme Corp",
    rating: 5,
  },
  {
    quote:
      "I built a customer feedback form in 90 seconds. Not exaggerating. The conditional logic and theme customization are incredible for a free tool.",
    name: "Marcus Rivera",
    role: "Founder, LaunchKit",
    rating: 5,
  },
  {
    quote:
      "The integrations are what sold us. Forms automatically sync to our Notion database and trigger Slack alerts. It just works.",
    name: "Priya Patel",
    role: "Engineering Manager at Dataflow",
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            Testimonials
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Loved by teams{" "}
            <span className="text-muted-foreground">worldwide</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Join thousands of teams who have transformed their form workflows.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="group relative rounded-2xl border border-border/50 bg-card p-6 transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
            >
              {/* Stars */}
              <div className="mb-4 flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="size-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>

              <blockquote className="mb-6 text-sm leading-relaxed text-muted-foreground">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              <div className="flex items-center gap-3">
                {/* Avatar placeholder */}
                <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-sm font-bold text-primary">
                  {t.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
