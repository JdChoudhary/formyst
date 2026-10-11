"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { ChatPanelProps } from "@/lib/ai-builder/types";
import { SessionHistoryMenu } from "./session-history-menu";

type ChatHeaderProps = Pick<
  ChatPanelProps,
  | "sessions"
  | "sessionId"
  | "startNewChat"
  | "openSession"
  | "deleteSession"
  | "isDeletingSession"
  | "isHydratingHistory"
>;

export function ChatHeader({
  sessions,
  sessionId,
  startNewChat,
  openSession,
  deleteSession,
  isDeletingSession,
  isHydratingHistory,
}: ChatHeaderProps) {
  return (
    <div className="bg-card/50 backdrop-blur">
      <div className="flex items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <Button
            aria-label="Back to form builder"
            asChild
            size="icon"
            variant="outline"
          >
            <Link href="/form-builder">
              <ArrowLeft aria-hidden className="size-4" />
            </Link>
          </Button>
          <h1 className="font-semibold text-lg">Kiko AI</h1>
        </div>
        <SessionHistoryMenu
          isDeleting={isDeletingSession}
          isHydrating={isHydratingHistory}
          onDeleteSession={deleteSession}
          onNewChat={startNewChat}
          onOpenSession={openSession}
          sessionId={sessionId}
          sessions={sessions}
        />
      </div>
      <Separator />
    </div>
  );
}
