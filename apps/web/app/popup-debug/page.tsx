"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function PopupDebugPage() {
  const [v, setV] = useState("a");
  return (
    <div className="flex min-h-screen flex-col gap-10 p-10">
      <h1 className="text-lg font-bold">Popup debug</h1>

      <section>
        <h2 className="mb-2 font-semibold">Select</h2>
        <Select value={v} onValueChange={(n) => setV(n)}>
          <SelectTrigger data-testid="select-trigger">
            <SelectValue />
          </SelectTrigger>
          <SelectContent data-testid="select-content">
            <SelectItem data-testid="select-item" value="a">
              Option A
            </SelectItem>
            <SelectItem value="b">Option B</SelectItem>
          </SelectContent>
        </Select>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">DropdownMenu plain</h2>
        <DropdownMenu>
          <DropdownMenuTrigger data-testid="menu-trigger">
            Open menu
          </DropdownMenuTrigger>
          <DropdownMenuContent data-testid="menu-content">
            <DropdownMenuItem data-testid="menu-item">Item 1</DropdownMenuItem>
            <DropdownMenuItem>Item 2</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">DropdownMenu render Button (dashboard pattern)</h2>
        <DropdownMenu>
          <DropdownMenuTrigger
            data-testid="menu2-trigger"
            render={<Button variant="outline" size="sm" className="gap-1.5 h-9" />}
          >
            <span data-testid="menu2-label">Filter</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent data-testid="menu2-content" align="end" className="w-40">
            <DropdownMenuItem>All</DropdownMenuItem>
            <DropdownMenuItem>Published</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Popover</h2>
        <Popover>
          <PopoverTrigger data-testid="popover-trigger">Open popover</PopoverTrigger>
          <PopoverContent data-testid="popover-content">Popover content</PopoverContent>
        </Popover>
      </section>
    </div>
  );
}