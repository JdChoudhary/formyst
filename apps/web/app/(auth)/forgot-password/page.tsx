"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Layers,
  ArrowRight,
  ArrowLeft,
  Mail,
  CheckCircle2,
  Loader2,
  Zap,
  BarChart3,
  Palette,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: resetError } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      const message = resetError.message || "Failed to send reset email";
      setError(message);
      toast.error(message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
    toast.success("Password reset email sent");
  };

  if (sent) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="size-7 text-emerald-500" />
        </div>
        <h2 className="mt-4 text-xl font-bold tracking-tight">
          Check your email
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a password reset link to{" "}
          <span className="font-medium text-foreground">{email}</span>. Click
          the link in the email to reset your password.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Didn&apos;t receive the email? Check your spam folder or{" "}
          <button
            onClick={() => {
              setSent(false);
              setEmail("");
            }}
            className="text-primary hover:underline font-medium"
          >
            try a different email
          </button>
        </p>
        <Button
          className="mt-6 w-full"
          render={<Link href="/login" />}
          nativeButton={false}
        >
          <ArrowLeft className="size-4" />
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-center gap-2">
          <div className="size-2 rounded-full bg-destructive animate-pulse" />
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label
          htmlFor="email"
          className="text-sm font-medium flex items-center gap-2"
        >
          <Mail className="size-4 text-muted-foreground" />
          Email address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
          className="flex h-12 w-full rounded-xl border bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary transition-all"
        />
      </div>

      <Button
        type="submit"
        className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20"
        disabled={loading}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Sending reset link...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            Send reset link
            <ArrowRight className="size-4" />
          </div>
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground pt-2">
        Remember your password?{" "}
        <Link
          href="/login"
          className="text-primary hover:underline font-semibold"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-foreground via-foreground/95 to-foreground/90">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] bg-[size:48px_48px]" />

        {/* Glow effects */}
        <div className="absolute top-20 left-20 size-80 rounded-full bg-primary/15 blur-[100px]" />
        <div className="absolute bottom-20 right-20 size-96 rounded-full bg-primary/10 blur-[120px]" />

        <div className="relative flex flex-col justify-between p-12 text-background">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex size-10 items-center justify-center rounded-xl bg-background/15 backdrop-blur-sm transition-transform group-hover:scale-105">
              <Layers className="size-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">Formyst</span>
          </Link>

          {/* Content */}
          <div className="flex flex-col">
            <h1 className="text-4xl font-bold mb-4 leading-tight lg:text-5xl">
              Forgot your
              <br />
              password?
            </h1>

            <p className="text-background/70 text-lg mb-10 max-w-md">
              No worries — we&apos;ll send you a reset link to get you back
              into your account.
            </p>

            <div className="space-y-4">
              {[
                { icon: Zap, text: "Quick & secure password reset" },
                { icon: BarChart3, text: "No data lost in the process" },
                { icon: Palette, text: "Back to building in minutes" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-background/15 backdrop-blur-sm">
                    <item.icon className="size-4" />
                  </div>
                  <span className="text-background/80 text-sm">
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom text */}
          <p className="text-xs text-background/40">
            © {new Date().getFullYear()} Formyst. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex flex-1 items-center justify-center px-4 sm:px-6 lg:px-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
              <div className="flex size-9 items-center justify-center rounded-xl bg-foreground">
                <Layers className="size-4.5 text-background" />
              </div>
              <span className="text-xl font-bold tracking-tight">Formyst</span>
            </Link>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Reset Password
            </h1>
            <p className="mt-2 text-muted-foreground">
              Enter your email to receive a reset link
            </p>
          </div>

          <Suspense
            fallback={
              <div className="rounded-2xl border bg-card p-8 animate-pulse">
                <div className="space-y-4">
                  <div className="h-12 rounded-xl bg-muted" />
                  <div className="h-12 rounded-xl bg-muted" />
                </div>
              </div>
            }
          >
            <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
              <ForgotPasswordForm />
            </div>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
