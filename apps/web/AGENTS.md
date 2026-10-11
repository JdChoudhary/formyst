<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Next.js 16 Agent Guidelines — formystz Frontend

## Project Context

This is the Next.js 16 frontend for the formystz platform (Mentimeter-like interactive formyst). See `../../CLAUDE.md` for the full architecture.

## Key Files

```
apps/web/
├── app/
│   ├── layout.tsx              # Root layout with fonts + providers
│   ├── page.tsx                # Landing page
│   ├── globals.css             # Tailwind CSS + global styles
│   ├── (auth)/                 # Auth pages (signin, signup)
│   │   ├── layout.tsx          # Auth layout
│   │   ├── signin/page.tsx
│   │   └── signup/page.tsx
│   └── dashboard/
│       └── page.tsx            # Dashboard home
├── components/ui/              # shadcn/ui components
├── hooks/
│   ├── api/auth/index.ts       # Auth API hooks
│   └── use-mobile.ts           # Mobile detection hook
├── lib/
│   ├── auth-client.ts          # Better Auth client + useSession hook
│   └── utils.ts                # cn() utility for classnames
├── providers/global.tsx        # Global React Context providers
└── trpc/
    ├── client.ts               # tRPC client setup
    ├── create-client.ts        # tRPC client factory
    └── server.ts               # tRPC server-side utilities
```

## Tech Stack

- **Next.js 16** with App Router
- **React 19** (server components by default)
- **Tailwind CSS 4** for styling
- **shadcn/ui** for UI components
- **Better Auth** for authentication
- **tRPC + TanStack Query** for API calls
- **Zod v4** for schema validation

## Component Patterns

### Server vs Client Components

```tsx
// Server Component (default) — no "use client" directive
// Can access DB directly, no hooks
export default async function Page() {
  return <div>Server-rendered content</div>;
}

// Client Component — add "use client" at top
("use client");
import { useState } from "react";

export function InteractiveComponent() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

### shadcn/ui Components

Located in `components/ui/`. Import like:

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
```

### Styling with Tailwind + cn()

```tsx
import { cn } from "@/lib/utils";

export function MyComponent({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "base-styles",
        "hover:state",
        className, // Allow override
      )}
    >
      Content
    </div>
  );
}
```

## Authentication

### Client-side Auth

```tsx
import { authClient, useSession } from "@/lib/auth-client";

// Get current session (hook from lib/auth-client.ts)
const { data, isPending, error } = useSession();

// Sign in
await authClient.signIn.email({ email, password });

// Sign up
await authClient.signIn.social({ provider: "github" });

// Sign out
await authClient.signOut();
```

> **Note:** `useSession` hook is defined in `lib/auth-client.ts`, not in `hooks/api/auth/index.ts`.

### Protected Pages

```tsx
// apps/web/app/dashboard/page.tsx
"use client";
import { useSession } from "@/lib/auth-client";
import { redirect } from "next/navigation";

export default function DashboardPage() {
  const { data, isPending } = useSession();

  if (!isPending && !data) {
    redirect("/signin");
  }

  return <div>Welcome, {data?.user?.name}</div>;
}
```

## tRPC Integration

### Client-side Queries

```tsx
"use client";
import { trpc } from "@/trpc/client";

export function MyComponent() {
  const { data, isLoading } = trpc.auth.getLoggedInUser.useQuery();

  if (isLoading) return <div>Loading...</div>;
  return <div>{data?.name}</div>;
}
```

### Client-side Mutations

```tsx
"use client";
import { trpc } from "@/trpc/client";

export function CreateForm() {
  const utils = trpc.useUtils();

  const mutation = trpc.presentation.create.useMutation({
    onSuccess: () => {
      utils.presentation.getAll.invalidate();
    },
  });

  return (
    <form onSubmit={() => mutation.mutate({ title: "New formyst" })}>
      <button type="submit">Create</button>
    </form>
  );
}
```

## Routing

### App Router Conventions

```
app/
├── page.tsx              → /
├── about/page.tsx        → /about
├── [id]/page.tsx         → /:id (dynamic)
├── (auth)/layout.tsx     → Layout group (no URL segment)
└── dashboard/
    └── page.tsx          → /dashboard
```

### Navigation

```tsx
import Link from "next/link";
import { useRouter } from "next/navigation";

// Link component (preferred for simple navigation)
<Link href="/dashboard">Dashboard</Link>;

// Programmatic navigation
const router = useRouter();
router.push("/dashboard");
router.back();
```

## Common Patterns

### Loading States

```tsx
// Suspense boundary
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AsyncComponent />
    </Suspense>
  );
}
```

### Error Handling

```tsx
// app/dashboard/error.tsx
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

### Forms

```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MyForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Handle submission
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <Input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <Button type="submit">Submit</Button>
    </form>
  );
}
```

## Important Notes

1. **Server Components are default** — Only add `"use client"` when you need hooks or browser APIs
2. **Tailwind CSS 4** — Uses new syntax, check `globals.css` for theme configuration
3. **shadcn/ui** — Components are in `components/ui/`, follow their patterns
4. **Better Auth** — Use `authClient` from `lib/auth-client.ts`, not raw fetch
5. **tRPC** — Use hooks from `trpc/client.ts`, not direct API calls
6. **Zod v4** — Use `z.object()` from `zod` (not `zod/v4`)
7. **TypeScript** — Strict mode, use proper types
