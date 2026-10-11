import { Building2, Cpu, Database, Globe, Rocket, Shield } from "lucide-react";

const logos = [
  { name: "Acme Corp", icon: Building2 },
  { name: "TechFlow", icon: Cpu },
  { name: "DataSync", icon: Database },
  { name: "LaunchPad", icon: Rocket },
  { name: "CloudBase", icon: Globe },
  { name: "SecureNet", icon: Shield },
];

export function Clients() {
  return (
    <section className="border-y border-border/50 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
          Trusted by innovative teams worldwide
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {logos.map((logo) => (
            <div
              key={logo.name}
              className="group flex items-center gap-2 text-muted-foreground/30 transition-colors hover:text-muted-foreground/60"
            >
              <logo.icon className="size-5" />
              <span className="text-sm font-semibold">{logo.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
