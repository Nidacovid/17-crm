import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatEUR } from "@/lib/format";

export default function Home() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-base p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Prueba de diseño</CardTitle>
          <CardDescription>
            Fase 0: tokens, tipografía y componentes base
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-secondary">
            Fondo base, tarjeta en superficie con borde de 1 px y botón de
            acento.
          </p>
          <p className="num font-heading text-[28px] font-semibold tracking-[-0.02em] text-primary">
            {formatEUR(1234.5)}
          </p>
          <Button>Acción principal</Button>
        </CardContent>
      </Card>
    </main>
  );
}
