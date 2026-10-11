"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Layers,
  ArrowRight,
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Zap,
  BarChart3,
  Palette,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const error = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState("");

  if (error) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-7 text-destructive" />
        </div>
        <h2 className="mt-4 text-xl font-bold tracking-tight">
          Invalid or expired link
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This password reset link is invalid or has expired. Please request a
          new one.
        </p>
        <Button
          className="mt-6 w-full"
          render={<Link href="/forgot-password" />}
          nativeButton={false}
        >
          Request new reset link
          <ArrowRight className="size-4" />
        </Button>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-7 text-destructive" />
        </div>
        <h2 className="mt-4 text-xl font-bold tracking-tight">
          Missing reset token
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No reset token was provided. Please use the link from your email to
          reset your password.
        </p>
        <Button
          className="mt-6 w-full"
          render={<Link href="/forgot-password" />}
          nativeButton={false}
        >
          Request new reset link
          <ArrowRight className="size-4" />
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="size-7 text-emerald-500" />
        </div>
        <h2 className="mt-4 text-xl font-bold tracking-tight">
          Password reset successful
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your password has been updated. You can now sign in with your new
          password.
        </p>
        <Button
          className="mt-6 w-full"
          onClick={() => router.push("/login")}
        >
          Sign in
          <ArrowRight className="size-4" />
        </Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (password !== confirmPassword) {
      setFormError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    const { error: resetError } = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    if (resetError) {
      const message = resetError.message || "Failed to reset password";
      setFormError(message);
      toast.error(message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    toast.success("Password reset successful");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {formError && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-center gap-2">
          <div className="size-2 rounded-full bg-destructive animate-pulse" />
          {formError}
        </div>
      )}

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="text-sm font-medium flex items-center gap-2"
        >
          <Lock className="size-4 text-muted-foreground" />
          New password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            required
            minLength={8}
            className="flex h-12 w-full rounded-xl border bg-background px-4 py-3 pr-12 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? (
              <EyeOff className="size-5" />
            ) : (
              <Eye className="size-5" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="confirmPassword"
          className="text-sm font-medium flex items-center gap-2"
        >
          <Lock className="size-4 text-muted-foreground" />
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter password"
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
            Resetting password...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            Reset password
            <ArrowRight className="size-4" />
          </div>
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground pt-2">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
        >
          <ArrowLeft className="size-3" />
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

export default function ResetPasswordPage() {
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
              Set a new
              <br />
              password
            </h1>

            <p className="text-background/70 text-lg mb-10 max-w-md">
              Choose a strong password to secure your account. Make sure it&apos;s
              something you&apos;ll remember.
            </p>

            <div className="space-y-4">
              {[
                { icon: Zap, text: "At least 8 characters recommended" },
                { icon: BarChart3, text: "Mix letters, numbers & symbols" },
                { icon: Palette, text: "Don't reuse old passwords" },
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
              Enter your new password below
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
              <ResetPasswordForm />
            </div>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
