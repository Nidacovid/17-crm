import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { revokeAndDeleteCredentials } from "@/lib/google/oauth";

// 10.3: revoca el token en Google y borra la fila de credenciales.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const result = await revokeAndDeleteCredentials(user.id);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "No se pudo desconectar." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}