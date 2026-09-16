import { Badge } from "@/components/ui/badge";
import {
  CLIENT_STATUS,
  CLIENT_STATUS_KEYS,
  PAYMENT_STATUS,
  PAYMENT_STATUS_KEYS,
  PROJECT_STATUS,
  PROJECT_STATUS_KEYS,
} from "@/lib/constants/statuses";
import { cn } from "@/lib/utils";

type StatusKey =
  | (typeof CLIENT_STATUS_KEYS)[number]
  | (typeof PROJECT_STATUS_KEYS)[number]
  | (typeof PAYMENT_STATUS_KEYS)[number];

// Fondo tenue (12 %), texto pleno y borde al 30 % (sección 3.5). Nunca sólidos.
const STATUS_STYLES: Record<StatusKey, string> = {
  terminado: "border-positive/30 bg-positive/12 text-positive",
  en_proceso: "border-accent/30 bg-accent/12 text-accent",
  potencial: "border-neutral/30 bg-neutral/12 text-neutral",
  nada: "border-muted/30 bg-muted/12 text-muted",
  a_empezar: "border-neutral/30 bg-neutral/12 text-neutral",
  en_desarrollo: "border-accent/30 bg-accent/12 text-accent",
  cancelado: "border-negative/30 bg-negative/12 text-negative",
  pagado: "border-positive/30 bg-positive/12 text-positive",
  pendiente: "border-secondary/30 bg-secondary/12 text-secondary",
  vencido: "border-negative/30 bg-negative/12 text-negative",
};

function labelFor(status: StatusKey): string {
  if (status in PAYMENT_STATUS) {
    return PAYMENT_STATUS[status as (typeof PAYMENT_STATUS_KEYS)[number]];
  }
  if (status in CLIENT_STATUS) {
    return CLIENT_STATUS[status as (typeof CLIENT_STATUS_KEYS)[number]];
  }
  return PROJECT_STATUS[status as (typeof PROJECT_STATUS_KEYS)[number]];
}

export function StatusBadge({
  status,
  className,
}: {
  status: StatusKey;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(STATUS_STYLES[status], className)}
    >
      {labelFor(status)}
    </Badge>
  );
}