"use client";

import React from "react";

interface InfoTooltipProps {
  text: string;
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  return (
    <span
      title={text}
      className="inline-flex items-center justify-center ml-1.5 h-4 w-4 rounded-full bg-muted text-muted-foreground text-[10px] font-bold cursor-help select-none hover:bg-blue-100 hover:text-blue-700 transition-colors duration-200"
      aria-label={text}
    >
      ?
    </span>
  );
}
