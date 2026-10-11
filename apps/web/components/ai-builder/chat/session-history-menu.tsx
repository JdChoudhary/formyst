"use client";

import { History, MessageSquarePlus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ChatSession } from "@/lib/ai-builder/types";

interface SessionHistoryMenuProps {
  sessions: ChatSession[];
  sessionId: string | null;
  isDeleting: boolean;
  isHydrating: boolean;
  onOpenSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onNewChat: () => void;
}

/** Compact "2h ago" / "3d ago" label for a session's last activity. */
function formatRelative(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);

  if (Number.isNaN(minutes)) return "";
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function sessionLabel(session: ChatSession): string {
  const title = session.title?.trim();
  return title && title.length > 0 ? title : "Untitled conversation";
}

export function SessionHistoryMenu({
  sessions,
  sessionId,
  isDeleting,
  isHydrating,
  onOpenSession,
  onDeleteSession,
  onNewChat,
}: SessionHistoryMenuProps) {
  const [open, setOpen] = useState(false);

  const handleOpen = (id: string) => {
    onOpenSession(id);
    setOpen(false);
  };

  const handleNewChat = () => {
    onNewChat();
    setOpen(false);
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <Button
            aria-label="Open chat history"
            size="sm"
            type="button"
            variant="outline"
          />
        }
      >
        <History aria-hidden className="size-4" />
        <span className="hidden sm:inline">Chats</span>
        {sessions.length > 0 && (
          <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">
            {sessions.length}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Your chats</PopoverTitle>
          <PopoverDescription>
            Resume a saved conversation or start a new one.
          </PopoverDescription>
        </PopoverHeader>

        <Button
          className="w-full justify-start"
          onClick={handleNewChat}
          size="sm"
          type="button"
          variant="secondary"
        >
          <MessageSquarePlus aria-hidden className="size-4" />
          New chat
        </Button>

        {sessions.length === 0 ? (
          <p className="px-1 py-4 text-center text-muted-foreground text-xs">
            No saved conversations yet.
          </p>
        ) : (
          <ScrollArea className="max-h-72">
            <ul className="flex flex-col gap-0.5 pr-1">
              {sessions.map((session) => {
                const isActive = session.id === sessionId;
                return (
                  <li key={session.id}>
                    <div
                      className={cn(
                        "group/row flex items-center gap-1 rounded-md px-1.5 py-1.5 transition-colors hover:bg-accent",
                        isActive && "bg-accent",
                      )}
                    >
                      <button
                        className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
                        onClick={() => handleOpen(session.id)}
                        type="button"
                      >
                        <span className="w-full truncate font-medium text-sm">
                          {sessionLabel(session)}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {formatRelative(session.updatedAt)}
                          {session.messageCount > 0
                            ? ` · ${session.messageCount} message${session.messageCount === 1 ? "" : "s"}`
                            : ""}
                        </span>
                      </button>
                      <Button
                        aria-label={`Delete ${sessionLabel(session)}`}
                        className="shrink-0 opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100"
                        disabled={isDeleting}
                        onClick={() => onDeleteSession(session.id)}
                        size="icon-xs"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 aria-hidden className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}

        {isHydrating && (
          <p className="px-1 text-center text-muted-foreground text-xs">
            Loading conversation…
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
