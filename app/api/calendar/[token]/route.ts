import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildIcsCalendar, type IcsEvent } from "@/lib/ics/build";
import { formatEUR } from "@/lib/format";
import { formatISO, parseISO, sub } from "date-fns";

// 10.7 / D-13: feed .ics público con token. Busca app_settings por ics_token
// con la clave de servicio; si no coincide, 404 (nunca 403, para no
// confirmar la existencia del recurso). La ruta está excluida del
// middleware porque los clientes de calendario no envían cookies.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const admin = createAdminClient();
  const { data: settings } = await admin
    .from("app_settings")
    .select("owner_id,reminder_time,reminder_days_before")
    .eq("ics_token", token)
    .maybeSingle();
  if (!settings) {
    return new NextResponse(null, { status: 404 });
  }

  const { data: payments } = await admin
    .from("payments")
    .select("id,project_id,amount,due_date")
    .eq("owner_id", settings.owner_id)
    .is("paid_at", null)
    .order("due_date", { ascending: true });
  if (!payments || payments.length === 0) {
    // Calendario válido sin vencimientos pendientes.
    return icsResponse(buildIcsCalendar([], settings.reminder_time));
  }

  const projectIds = [...new Set(payments.map((row) => row.project_id))];
  const { data: projects } = await admin
    .from("projects")
    .select("id,name,code,client_id")
    .in("id", projectIds);
  const clientIds = [
    ...new Set((projects ?? []).map((row) => row.client_id)),
  ];
  const { data: clients } = clientIds.length
    ? await admin
        .from("clients")
        .select("id,business_name")
        .in("id", clientIds)
    : { data: [] };

  const projectById = new Map(
    (projects ?? []).map((row) => [row.id, row]),
  );
  const businessByClient = new Map(
    (clients ?? []).map((row) => [row.id, row.business_name]),
  );

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const daysBefore = Number(settings.reminder_days_before ?? 0);

  const events: IcsEvent[] = payments.map((payment) => {
    const project = projectById.get(payment.project_id);
    const businessName = project
      ? (businessByClient.get(project.client_id) ?? "")
      : "";
    // Espejo del evento de Google (10.5): día completo en due_date
    // desplazado reminder_days_before días antes si está configurado.
    const base = parseISO(`${payment.due_date}T00:00:00`);
    const day = formatISO(sub(base, { days: daysBefore }), {
      representation: "date",
    });
    return {
      uid: `pago-${payment.id}@crm`,
      summary: `Cobro · ${businessName} · ${formatEUR(Number(payment.amount))}`,
      date: day,
      description: `Proyecto: ${project?.name ?? ""} (${project?.code ?? ""})\nCliente: ${businessName}\nAbrir: ${appUrl}/proyectos/${payment.project_id}`,
    };
  });

  return icsResponse(buildIcsCalendar(events, settings.reminder_time));
}

function icsResponse(body: string): NextResponse {
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "public, max-age=900",
    },
  });
}