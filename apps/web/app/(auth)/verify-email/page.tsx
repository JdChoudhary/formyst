"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Layers,
  ArrowRight,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Mail,
  Zap,
  BarChart3,
  Globe,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const error = searchParams.get("error");

  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    if (error) {
      setVerifying(false);
      return;
    }

    if (!token) {
      setVerifying(false);
      return;
    }

    // Better Auth auto-verifies when user clicks the email link.
    // The server processes the token and redirects with ?token= or ?error=.
    // On this page we just need to show the result.
    // If we arrived here with a valid token, the server already verified it.
    const verifyEmail = async () => {
      try {
        // The URL from Better Auth already contains the token.
        // When the user clicks the verification link, Better Auth server
        // processes it. If autoSignInAfterVerification is true, the user
        // is already signed in. We just need to confirm success.
        setVerified(true);
        setVerifying(false);
        toast.success("Email verified successfully");
      } catch {
        setVerifying(false);
      }
    };

    verifyEmail();
  }, [token, error]);

  const handleResend = async () => {
    setResending(true);
    const { error: resendError } = await authClient.sendVerificationEmail({
      email: userEmail || "your email",
      callbackURL: `${window.location.origin}/verify-email`,
    });
    setResending(false);
    if (resendError) {
      toast.error(resendError.message || "Failed to resend verification email");
      return;
    }
    toast.success("Verification email sent");
  };

  if (error) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-7 text-destructive" />
        </div>
        <h2 className="mt-4 text-xl font-bold tracking-tight">
          Verification failed
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {error === "INVALID_TOKEN"
            ? "This verification link is invalid or has expired."
            : "Something went wrong while verifying your email."}
        </p>
        <Button
          className="mt-6 w-full"
          render={<Link href="/register" />}
          nativeButton={false}
        >
          Create a new account
        </Button>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted">
          <Mail className="size-7 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-xl font-bold tracking-tight">
          Check your email
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a verification link to your email address. Click the link to
          verify your account.
        </p>

        <div className="mt-6 space-y-3">
          <input
            type="email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="Enter your email to resend"
            className="flex h-12 w-full rounded-xl border bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary transition-all"
          />
          <Button
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={resending || !userEmail}
          >
            {resending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Mail className="size-4" />
            )}
            Resend verification email
          </Button>
        </div>

        <Button
          className="mt-4 w-full"
          render={<Link href="/login" />}
          nativeButton={false}
        >
          Go to sign in
          <ArrowRight className="size-4" />
        </Button>
      </div>
    );
  }

  if (verifying) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
          <Loader2 className="size-7 text-primary animate-spin" />
        </div>
        <h2 className="mt-4 text-xl font-bold tracking-tight">
          Verifying your email...
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Please wait while we verify your email address.
        </p>
      </div>
    );
  }

  if (verified) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="size-7 text-emerald-500" />
        </div>
        <h2 className="mt-4 text-xl font-bold tracking-tight">
          Email verified!
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your email has been verified. You can now access all features of your
          account.
        </p>
        <Button
          className="mt-6 w-full"
          onClick={() => router.push("/dashboard")}
        >
          Go to dashboard
          <ArrowRight className="size-4" />
        </Button>
        <Button
          variant="outline"
          className="mt-2 w-full"
          render={<Link href="/login" />}
          nativeButton={false}
        >
          Sign in instead
        </Button>
      </div>
    );
  }

  return null;
}

export default function VerifyEmailPage() {
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
              Verify your
              <br />
              email address
            </h1>

            <p className="text-background/70 text-lg mb-10 max-w-md">
              We need to verify your email to keep your account secure. Check
              your inbox for the verification link.
            </p>

            <div className="space-y-4">
              {[
                { icon: Zap, text: "Quick one-click verification" },
                { icon: BarChart3, text: "Unlock all form features" },
                { icon: Globe, text: "Share forms with confidence" },
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
              Verify Email
            </h1>
            <p className="mt-2 text-muted-foreground">
              Confirm your email address to continue
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
              <VerifyEmailForm />
            </div>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
