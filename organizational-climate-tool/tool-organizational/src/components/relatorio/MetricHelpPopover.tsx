"use client";

import { HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Props = {
  title: string;
  children: React.ReactNode;
};

export function MetricHelpPopover({ title, children }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground hover:bg-blue-100 hover:text-blue-700 ml-1.5"
          aria-label={title}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 text-sm" side="top" align="start">
        <p className="font-semibold mb-2">{title}</p>
        <div className="text-muted-foreground space-y-2 leading-relaxed">{children}</div>
      </PopoverContent>
    </Popover>
  );
}
