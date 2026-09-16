"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchInputProps = {
  placeholder?: string;
  /** Nombre del parámetro de URL que refleja la búsqueda (por defecto "q"). */
  paramKey?: string;
  /** Retardo en ms antes de aplicar la búsqueda a la URL. */
  delay?: number;
  className?: string;
};

// Búsqueda con retardo de 250 ms reflejada en la URL, compartible y
// resistente a una recarga.
export function SearchInput({
  placeholder,
  paramKey = "q",
  delay = 250,
  className,
}: SearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(paramKey) ?? "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function updateParam(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set(paramKey, next);
    else params.delete(paramKey);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function handleChange(next: string) {
    setValue(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => updateParam(next), delay);
  }

  return (
    <div className={cn("relative w-full max-w-sm", className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted"
        strokeWidth={1.5}
      />
      <Input
        type="text"
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder ?? "Buscar"}
        className="pr-8 pl-8"
      />
      {value ? (
        <button
          type="button"
          aria-label="Quitar búsqueda"
          onClick={() => {
            if (timerRef.current) clearTimeout(timerRef.current);
            setValue("");
            updateParam("");
          }}
          className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted transition-colors hover:text-primary"
        >
          <X aria-hidden className="size-3.5" strokeWidth={1.5} />
        </button>
      ) : null}
    </div>
  );
}