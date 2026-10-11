"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Pricing", href: "/pricing" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div
          className={cn(
            "mt-3 flex items-center justify-between rounded-2xl border border-border/50 bg-background/80 px-4 py-2.5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 sm:px-6",
          )}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex size-8 items-center justify-center rounded-lg bg-foreground transition-transform group-hover:scale-105">
              <Layers className="size-4 text-background" />
            </div>
            <span className="text-lg font-bold tracking-tight">Formyst</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-2 md:flex">
            <Button variant="ghost" size="sm" render={<Link href="/login" />} nativeButton={false}>
              Sign In
            </Button>
            <Button size="sm" render={<Link href="/register" />} nativeButton={false}>
              Get Started Free
            </Button>
          </div>

          {/* Mobile toggle */}
          <button
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="mt-2 rounded-2xl border border-border/50 bg-background/95 p-4 backdrop-blur-xl md:hidden">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="my-2 h-px bg-border" />
              <Button
                variant="ghost"
                size="sm"
                className="justify-start"
                render={<Link href="/login" onClick={() => setMobileOpen(false)} />}
                nativeButton={false}
              >
                Sign In
              </Button>
              <Button
                size="sm"
                render={<Link href="/register" onClick={() => setMobileOpen(false)} />}
                nativeButton={false}
              >
                Get Started Free
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
