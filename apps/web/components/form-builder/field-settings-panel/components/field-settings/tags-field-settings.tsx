import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { FieldSettingsProps } from "./types";

export function TagsFieldSettings({ field, onUpdateSettings }: FieldSettingsProps) {
  return (
    <Card className="gap-2 p-4 shadow-none">
      <CardHeader className="p-0">
        <CardTitle className="flex items-center gap-2 text-lg">Tags Settings</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-0">
        <div className="flex flex-col gap-2">
          <Label className="font-medium text-sm" htmlFor="tags-max">
            Maximum tags
          </Label>
          <Input
            aria-describedby="tags-max-help"
            autoComplete="off"
            className="w-20"
            id="tags-max"
            max={50}
            min={1}
            name="tags-max"
            onChange={(e) =>
              onUpdateSettings({
                max_tags: Math.max(1, Math.min(50, Number.parseInt(e.target.value, 10) || 20)),
              })
            }
            type="number"
            value={field.properties?.max_tags ?? 20}
          />
          <p className="text-muted-foreground text-xs" id="tags-max-help">
            How many tags a respondent can add (1-50)
          </p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Label className="font-medium text-sm" htmlFor="tags-duplicates">
              Allow duplicates
            </Label>
            <p className="text-muted-foreground text-xs" id="tags-duplicates-help">
              Let the same tag be added more than once
            </p>
          </div>
          <Switch
            checked={field.properties?.allow_duplicates ?? false}
            id="tags-duplicates"
            onCheckedChange={(allow_duplicates) => onUpdateSettings({ allow_duplicates })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label className="font-medium text-sm" htmlFor="tags-placeholder">
            Placeholder
          </Label>
          <Input
            autoComplete="off"
            id="tags-placeholder"
            name="tags-placeholder"
            onChange={(e) => onUpdateSettings({ placeholder: e.target.value })}
            placeholder="Type and press Enter..."
            value={field.properties?.placeholder ?? ""}
          />
        </div>
      </CardContent>
    </Card>
  );
}
