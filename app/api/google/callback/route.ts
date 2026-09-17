import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  exchangeCodeForTokens,
  fetchGoogleEmail,
  getGoogleClient,
  saveTokens,
} from "@/lib/google/oauth";
import { ensureCobrosCalendar } from "@/lib/google/calendar";

function ajustesUrl(request: Request, status: string): NextResponse {
  return NextResponse.redirect(
    new URL(`/ajustes?google=${status}`, request.url),
  );
}

// 10.3: verifica state, canjea el código, cifra y guarda los tokens en
// private.google_credentials, crea el calendario "Cobros · CRM" si falta y
// redirige a /ajustes?google=ok.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("google_oauth_state")?.value ?? "";

  if (!code || !state || !expectedState || state !== expectedState) {
    return ajustesUrl(request, "error");
  }
  cookieStore.delete("google_oauth_state");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  let tokens: Awaited<ReturnType<typeof exchangeCodeForTokens>>;
  try {
    tokens = await exchangeCodeForTokens(code);
  } catch {
    return ajustesUrl(request, "error");
  }
  if (!tokens.access_token) {
    return ajustesUrl(request, "error");
  }

  // prompt=consent + access_type=offline entregan refresh_token, pero si
  // Google no lo devuelve se pasa null y el upsert conserva el anterior.
  const email = await fetchGoogleEmail(tokens.access_token);
  try {
    await saveTokens(user.id, {
      refreshToken: tokens.refresh_token ?? null,
      accessToken: tokens.access_token,
      expiresAt: new Date(
        tokens.expiry_date ?? Date.now() + 60 * 60_000,
      ).toISOString(),
      scope: tokens.scope ?? null,
      email,
    });
  } catch {
    return ajustesUrl(request, "error");
  }

  // Creación del calendario dedicado si app_settings.google_calendar_id
  // está vacío. Si falla, la conexión queda usable con el principal.
  try {
    const calendar = await getGoogleClient(user.id);
    if (calendar) {
      await ensureCobrosCalendar(user.id, calendar);
    }
  } catch {
    // El calendario se creará en el próximo intento de sincronización
    // manual; la conexión ya está guardada.
  }

  return ajustesUrl(request, "ok");
}