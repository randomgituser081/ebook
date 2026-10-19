"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function AccordionItem({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-base font-semibold text-heading-deep">{title}</span>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-glass-soft text-heading-deep transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        >
          <ChevronDown className="h-5 w-5" />
        </span>
      </button>

      {/* grid-rows 0fr → 1fr animates height without measuring or a library */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
        inert={!open}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 text-lg text-gray-600">{children}</div>
        </div>
      </div>
    </div>
  );
}
