"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "react-day-picker/locale";
import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type DateFieldProps = {
  /** Fecha en ISO corto (YYYY-MM-DD). */
  value: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
};

// Selector de fecha compacto para formularios inline.
export function DateField({
  value,
  onChange,
  placeholder = "Fecha",
  className,
  ...ariaProps
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(`${value}T00:00:00`) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("num font-normal text-secondary", className)}
          {...ariaProps}
        >
          <CalendarDays aria-hidden strokeWidth={1.5} />
          {value ? formatDate(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          locale={es}
          selected={selected}
          onSelect={(date) => {
            if (date) {
              onChange(format(date, "yyyy-MM-dd"));
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}