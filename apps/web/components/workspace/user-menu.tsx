"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOut, ShieldCheck, Undo2 } from "lucide-react";
import { authClient, signOut, useSession } from "~/lib/auth-client";
import { initials } from "@/lib/workspace";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function UserMenu({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;

  if (!user) return null;

  const isAdmin = (user as { role?: string | null }).role === "admin";
  const impersonatedBy = (session?.session as { impersonatedBy?: string | null } | undefined)
    ?.impersonatedBy;

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    router.push("/login");
    router.refresh();
  };

  const handleStopImpersonating = async () => {
    const { error } = await authClient.admin.stopImpersonating();
    if (error) {
      toast.error(error.message ?? "Failed to stop impersonating");
      return;
    }
    toast.success("Stopped impersonating");
    router.push("/admin");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size={compact ? "icon-sm" : "sm"}
            className={
              compact
                ? "size-8 rounded-lg"
                : "h-10 w-full justify-start gap-2 px-2"
            }
          />
        }
      >
        <Avatar className={compact ? "size-6 rounded-md" : "size-7 rounded-lg"}>
          {user.image ? (
            <AvatarImage
              src={user.image}
              alt={user.name ?? ""}
              className={compact ? "rounded-md" : "rounded-lg"}
            />
          ) : null}
          <AvatarFallback className={compact ? "rounded-md text-[10px]" : "rounded-lg text-xs"}>
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
        {!compact && (
          <span className="flex min-w-0 flex-1 flex-col items-start leading-tight">
            <span className="max-w-[10rem] truncate text-sm font-medium">{user.name}</span>
            <span className="max-w-[10rem] truncate text-xs text-muted-foreground">{user.email}</span>
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" side="top" sideOffset={6} className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="flex items-center gap-2.5 py-1">
              <Avatar className="size-9 rounded-lg">
                {user.image ? (
                  <AvatarImage src={user.image} alt={user.name ?? ""} className="rounded-lg" />
                ) : null}
                <AvatarFallback className="rounded-lg">{initials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {impersonatedBy ? (
            <DropdownMenuItem onClick={handleStopImpersonating}>
              <Undo2 className="size-4" />
              Stop impersonating
            </DropdownMenuItem>
          ) : null}
          {isAdmin ? (
            <DropdownMenuItem onClick={() => router.push("/admin")}>
              <ShieldCheck className="size-4" />
              Admin dashboard
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
            <LogOut className="size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
