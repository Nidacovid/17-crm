import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listGoogleEvents } from "@/lib/google/calendar";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// 10.6: eventos del calendario principal y del de Cobros para Home,
// normalizados a { id, title, start, end, allDay, source }. Con caché de
// 5 minutos dentro de listGoogleEvents para no agotar la cuota. Si no hay
// conexión devuelve 200 con connected=false, no un error.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const today = new Date().toISOString().slice(0, 10);
  const from = searchParams.get("from") ?? today;
  const to = searchParams.get("to") ?? today;
  if (!DATE_PATTERN.test(from) || !DATE_PATTERN.test(to) || from > to) {
    return NextResponse.json({ error: "Fechas no válidas." }, { status: 400 });
  }

  const result = await listGoogleEvents(user.id, from, to);
  return NextResponse.json(result);
}