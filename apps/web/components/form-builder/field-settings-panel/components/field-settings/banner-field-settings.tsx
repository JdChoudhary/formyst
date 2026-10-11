import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FieldSettingsProps } from "./types";

export function BannerFieldSettings({ field, onUpdateSettings }: FieldSettingsProps) {
  return (
    <Card className="gap-2 p-4 shadow-none">
      <CardHeader className="p-0">
        <CardTitle className="flex items-center gap-2 text-lg">Banner Settings</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-0">
        <div className="flex flex-col gap-2">
          <Label className="font-medium text-sm" htmlFor="banner-variant">
            Tone
          </Label>
          <Select
            onValueChange={(value) => onUpdateSettings({ banner_variant: value as "info" })}
            value={field.properties?.banner_variant ?? "info"}
          >
            <SelectTrigger className="w-36" id="banner-variant">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            Controls the icon and colors used by the banner
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="font-medium text-sm" htmlFor="banner-title">
            Title
          </Label>
          <Input
            autoComplete="off"
            id="banner-title"
            name="banner-title"
            onChange={(e) => onUpdateSettings({ banner_title: e.target.value })}
            placeholder="Heads up"
            value={field.properties?.banner_title ?? ""}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label className="font-medium text-sm" htmlFor="banner-description">
            Message
          </Label>
          <Textarea
            className="resize-none"
            id="banner-description"
            name="banner-description"
            onChange={(e) => onUpdateSettings({ description: e.target.value })}
            placeholder="Add important information your respondents should see."
            rows={3}
            value={field.properties?.description ?? ""}
          />
        </div>
      </CardContent>
    </Card>
  );
}
