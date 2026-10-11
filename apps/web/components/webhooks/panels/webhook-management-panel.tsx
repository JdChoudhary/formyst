"use client"

import { PlusIcon, Trash2Icon, WebhookIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Webhook {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
}

const EVENTS = ["submission.created", "submission.updated"] as const;

const getStorageKey = (formId: string) => `form-webhooks-${formId}`;

function loadWebhooks(formId: string): Webhook[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(getStorageKey(formId));
    return raw ? (JSON.parse(raw) as Webhook[]) : [];
  } catch {
    return [];
  }
}

export function WebhookManagementPanel({ formId }: { formId: string }) {
  const [webhooks, setWebhooks] = useState<Webhook[]>(() => loadWebhooks(formId));
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(getStorageKey(formId), JSON.stringify(webhooks));
    } catch {
      // storage may be unavailable (private mode) — ignore
    }
  }, [webhooks, formId]);

  const addWebhook = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error("Please enter a webhook URL");
      return;
    }
    const webhook: Webhook = {
      id: `wh_${Date.now()}`,
      url: trimmed,
      events: [...EVENTS],
      enabled: true,
    };
    setWebhooks((prev) => [...prev, webhook]);
    setUrl("");
    setAdding(false);
    toast.success("Webhook added");
  };

  const removeWebhook = (id: string) => {
    setWebhooks((prev) => prev.filter((wh) => wh.id !== id));
    toast.success("Webhook removed");
  };

  const toggleWebhook = (id: string) => {
    setWebhooks((prev) =>
      prev.map((wh) => (wh.id === id ? { ...wh, enabled: !wh.enabled } : wh))
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <Label className="font-medium text-sm" htmlFor="webhook-url">
              Endpoint URL
            </Label>
            <p className="text-muted-foreground text-xs">
              We'll POST form submissions to this URL as JSON.
            </p>
          </div>
        </div>
        {!adding ? (
          <Button
            className="w-fit gap-2"
            onClick={() => setAdding(true)}
            size="sm"
            variant="outline"
          >
            <PlusIcon className="size-4" />
            Add webhook
          </Button>
        ) : (
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
            <Input
              autoComplete="off"
              id="webhook-url"
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addWebhook();
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder="https://example.com/hooks/form-submitted"
              type="url"
              value={url}
            />
            <div className="flex items-center gap-2">
              <Button onClick={addWebhook} size="sm">
                Save webhook
              </Button>
              <Button
                onClick={() => {
                  setAdding(false);
                  setUrl("");
                }}
                size="sm"
                variant="ghost"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {webhooks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center">
          <WebhookIcon className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No webhooks configured yet.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {webhooks.map((webhook) => (
            <li
              className="flex items-center gap-3 rounded-lg border p-3"
              key={webhook.id}
            >
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate font-mono text-sm",
                    !webhook.enabled && "text-muted-foreground line-through"
                  )}
                >
                  {webhook.url}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {webhook.events.map((event) => (
                    <Badge className="text-xs" key={event} variant="secondary">
                      {event}
                    </Badge>
                  ))}
                </div>
              </div>
              <Switch
                aria-label="Toggle webhook"
                checked={webhook.enabled}
                onCheckedChange={() => toggleWebhook(webhook.id)}
              />
              <Button
                aria-label={`Delete ${webhook.url}`}
                onClick={() => removeWebhook(webhook.id)}
                size="icon"
                variant="ghost"
              >
                <Trash2Icon className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
