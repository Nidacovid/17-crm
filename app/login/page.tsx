"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type State = "idle" | "sending" | "sent" | "error";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setError("");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signInError) {
      setError(signInError.message);
      setState("error");
      return;
    }

    setState("sent");
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-base p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-display text-[28px] font-semibold tracking-[-0.02em] text-primary">
            CRM
          </CardTitle>
        </CardHeader>
        <CardContent>
          {state === "sent" ? (
            <div className="space-y-2">
              <p className="text-sm text-primary">Enlace enviado</p>
              <p className="text-xs text-secondary">
                Revisa tu correo ({email}) y pulsa el enlace para acceder.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tu@correo.com"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={state === "sending"}
              >
                {state === "sending" ? "Enviando…" : "Enviar enlace de acceso"}
              </Button>
              {state === "error" ? (
                <p className="text-xs text-negative">{error}</p>
              ) : null}
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
