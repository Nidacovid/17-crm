import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncPayment } from "@/lib/google/calendar";

const RESYNC_PAUSE_MS = 200;

// 10.5: resincronización manual. Procesa todos los pagos con
// sync_state ∈ {pendiente, error} en serie y con una pausa de 200 ms
// entre llamadas.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { data: payments, error } = await supabase
    .from("payments")
    .select("id")
    .in("sync_state", ["pendiente", "error"])
    .order("due_date", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = (payments ?? []).map((row) => row.id);
  let synced = 0;
  let failed = 0;
  let skipped = 0;
  for (let index = 0; index < ids.length; index += 1) {
    const outcome = await syncPayment(ids[index]);
    if (outcome === "sincronizado" || outcome === "no_aplica") synced += 1;
    else if (outcome === "error") failed += 1;
    else skipped += 1;
    if (index < ids.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, RESYNC_PAUSE_MS));
    }
  }

  return NextResponse.json({
    ok: true,
    processed: ids.length,
    synced,
    failed,
    skipped,
  });
}