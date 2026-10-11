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
import type { FieldSettingsProps } from "./types";

export function DividerFieldSettings({ field, onUpdateSettings }: FieldSettingsProps) {
  return (
    <Card className="gap-2 p-4 shadow-none">
      <CardHeader className="p-0">
        <CardTitle className="flex items-center gap-2 text-lg">Divider Settings</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-0">
        <div className="flex flex-col gap-2">
          <Label className="font-medium text-sm" htmlFor="divider-text">
            Label
          </Label>
          <Input
            aria-describedby="divider-text-help"
            autoComplete="off"
            id="divider-text"
            name="divider-text"
            onChange={(e) => onUpdateSettings({ divider_text: e.target.value })}
            placeholder="Optional label on the line"
            value={field.properties?.divider_text ?? ""}
          />
          <p className="text-muted-foreground text-xs" id="divider-text-help">
            Leave empty for a plain horizontal rule
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="font-medium text-sm" htmlFor="divider-style">
            Line style
          </Label>
          <Select
            onValueChange={(value) => onUpdateSettings({ divider_style: value as "solid" })}
            value={field.properties?.divider_style ?? "solid"}
          >
            <SelectTrigger className="w-32" id="divider-style">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="solid">Solid</SelectItem>
              <SelectItem value="dashed">Dashed</SelectItem>
              <SelectItem value="dotted">Dotted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="font-medium text-sm" htmlFor="divider-align">
            Alignment
          </Label>
          <Select
            onValueChange={(value) => onUpdateSettings({ align: value as "center" })}
            value={field.properties?.align ?? "center"}
          >
            <SelectTrigger className="w-32" id="divider-align">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
