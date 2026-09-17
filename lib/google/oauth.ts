// SOLO SERVIDOR (D-15, regla 2.1.5): flujo OAuth de Google y obtención del
// cliente autenticado. Los tokens viven cifrados en private.google_credentials
// y solo se acceden con la clave de servicio.
import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt, encrypt } from "@/lib/google/crypto";

// 10.1.6: ámbito único de Calendar.
export const GOOGLE_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar";

type GoogleCredentialsRow = {
  owner_id: string;
  refresh_token_enc: string | null;
  access_token_enc: string | null;
  access_token_expires_at: string | null;
  scope: string | null;
  google_email: string | null;
  connected_at: string | null;
  updated_at: string | null;
};

function clientConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET.");
  }
  return { clientId, clientSecret };
}

export function redirectUri(): string {
  return (
    process.env.GOOGLE_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/google/callback`
  );
}

function buildOAuth2() {
  const { clientId, clientSecret } = clientConfig();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri());
}

// 10.3: URL de consentimiento con access_type=offline y prompt=consent,
// imprescindibles para que Google entregue el token de refresco.
export function buildAuthUrl(state: string): string {
  const oauth2 = buildOAuth2();
  return oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [GOOGLE_CALENDAR_SCOPE],
    state,
  });
}

// 10.3: canje del código de autorización por los tokens.
export async function exchangeCodeForTokens(code: string) {
  const oauth2 = buildOAuth2();
  const { tokens } = await oauth2.getToken(code);
  return tokens;
}

// Correo de la cuenta conectada, solo informativo ("Conectado como…").
export async function fetchGoogleEmail(accessToken: string): Promise<
  string | null
> {
  try {
    const oauth2 = buildOAuth2();
    const info = await oauth2.getTokenInfo(accessToken);
    return info.email ?? null;
  } catch {
    return null;
  }
}

// Refresco fallido por token revocado o caducado (modo Testing, 10.1.5).
function isInvalidGrant(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const data = (error as { response?: { data?: { error?: string } } })
    ?.response?.data;
  return message.includes("invalid_grant") || data?.error === "invalid_grant";
}

async function readCredentials(
  ownerId: string,
): Promise<GoogleCredentialsRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .schema("private")
    .from("google_credentials")
    .select(
      "owner_id,refresh_token_enc,access_token_enc,access_token_expires_at,scope,google_email,connected_at,updated_at",
    )
    .eq("owner_id", ownerId)
    .maybeSingle();
  // Error de API (p. ej. esquema no expuesto) = sin credenciales usables.
  if (error) return null;
  return (data as GoogleCredentialsRow | null) ?? null;
}

// 10.4: obtención del cliente autenticado. Refresca el token de acceso si
// le quedan menos de 5 minutos y guarda el nuevo cifrado. Si el refresco
// falla con invalid_grant, borra las credenciales (la conexión queda
// caducada) y devuelve null. Nunca reintenta en bucle.
export async function getGoogleClient(
  ownerId: string,
): Promise<calendar_v3.Calendar | null> {
  const creds = await readCredentials(ownerId);
  if (!creds) return null;

  const accessToken = creds.access_token_enc
    ? decrypt(creds.access_token_enc)
    : null;
  const refreshToken = creds.refresh_token_enc
    ? decrypt(creds.refresh_token_enc)
    : null;
  const expiresAtMs = creds.access_token_expires_at
    ? new Date(creds.access_token_expires_at).getTime()
    : 0;

  const oauth2 = buildOAuth2();

  if (accessToken && expiresAtMs - Date.now() > 5 * 60_000) {
    oauth2.setCredentials({ access_token: accessToken });
    return google.calendar({ version: "v3", auth: oauth2 });
  }

  if (!refreshToken) {
    // Sin refresco y con el acceso caducado la conexión es inservible.
    await deleteCredentials(ownerId);
    return null;
  }

  oauth2.setCredentials({ refresh_token: refreshToken });
  try {
    const { credentials } = await oauth2.refreshAccessToken();
    if (!credentials.access_token) {
      throw new Error("Google no devolvió token de acceso.");
    }
    const expiresAt = new Date(
      credentials.expiry_date ?? Date.now() + 60 * 60_000,
    ).toISOString();
    await saveTokens(ownerId, {
      refreshToken: credentials.refresh_token ?? refreshToken,
      accessToken: credentials.access_token,
      expiresAt,
      scope: credentials.scope ?? creds.scope,
      email: creds.google_email,
    });
    return google.calendar({ version: "v3", auth: oauth2 });
  } catch (error) {
    if (isInvalidGrant(error)) {
      // Token revocado en Google o caducado: la conexión se da por caducada.
      await deleteCredentials(ownerId);
    }
    // Otros errores (red, 5xx): no se borra nada; se reintenta en la
    // próxima llamada, sin bucle.
    return null;
  }
}

// Guarda (o actualiza) los tokens cifrados en private.google_credentials.
// Lanza si la escritura falla: el callback debe tratarlo como error de
// conexión, nunca como éxito silencioso.
export async function saveTokens(
  ownerId: string,
  input: {
    refreshToken: string | null;
    accessToken: string;
    expiresAt: string;
    scope?: string | null;
    email: string | null;
  },
): Promise<void> {
  const admin = createAdminClient();
  const row: Record<string, unknown> = {
    owner_id: ownerId,
    access_token_enc: encrypt(input.accessToken),
    access_token_expires_at: input.expiresAt,
    scope: input.scope ?? GOOGLE_CALENDAR_SCOPE,
    google_email: input.email,
    connected_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (input.refreshToken) {
    row.refresh_token_enc = encrypt(input.refreshToken);
  }
  const { error } = await admin
    .schema("private")
    .from("google_credentials")
    .upsert(row, { onConflict: "owner_id" });
  if (error) {
    throw new Error(
      `No se pudieron guardar las credenciales de Google: ${error.message}`,
    );
  }
}

export async function deleteCredentials(ownerId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin
    .schema("private")
    .from("google_credentials")
    .delete()
    .eq("owner_id", ownerId);
  return !error;
}

// 10.3: desconexión. Revoca el token en Google (si la revocación falla,
// se borra igualmente la fila local) y borra las credenciales.
export async function revokeAndDeleteCredentials(
  ownerId: string,
): Promise<{ ok: boolean; error?: string }> {
  const creds = await readCredentials(ownerId);
  if (!creds) return { ok: true };

  const token = creds.refresh_token_enc
    ? decrypt(creds.refresh_token_enc)
    : creds.access_token_enc
      ? decrypt(creds.access_token_enc)
      : null;
  if (token) {
    try {
      const oauth2 = buildOAuth2();
      await oauth2.revokeToken(token);
    } catch {
      // La revocación puede fallar si el token ya no es válido: se borra
      // igualmente la fila local.
    }
  }
  const deleted = await deleteCredentials(ownerId);
  return deleted
    ? { ok: true }
    : { ok: false, error: "No se pudieron borrar las credenciales." };
}

export async function getConnectionState(ownerId: string) {
  const creds = await readCredentials(ownerId);
  return {
    connected: creds !== null,
    email: creds?.google_email ?? null,
    connectedAt: creds?.connected_at ?? null,
  };
}