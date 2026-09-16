import { createClient } from "@/lib/supabase/server";
import type { PROJECT_STATUS_KEYS } from "@/lib/constants/statuses";
import type { DOCUMENT_KIND_KEYS } from "@/lib/constants/statuses";
import type { PaymentListRow } from "@/lib/queries/payments";
import { getProjectPayments } from "@/lib/queries/payments";
import type { ProjectExpenseRow } from "@/lib/queries/expenses";
import { getProjectExpenses } from "@/lib/queries/expenses";

export type ProjectStatusKey = (typeof PROJECT_STATUS_KEYS)[number];
export type DocumentKindKey = (typeof DOCUMENT_KIND_KEYS)[number];
export type ProjectStatusCounts = Record<ProjectStatusKey | "todos", number>;

export type ProjectListRow = {
  id: string;
  code: string;
  name: string;
  status: ProjectStatusKey;
  level: number;
  price_net: number;
  client_id: string;
  business_name: string;
  minutes_total: number;
  hours_total: number;
  pending: number;
  tasks_done: number;
  tasks_total: number;
};

export type ProjectTotals = {
  project_id: string;
  name: string;
  status: ProjectStatusKey;
  level: number;
  client_id: string;
  price_net: number;
  price_gross: number;
  estimated_hours: number | null;
  minutes_total: number;
  hours_total: number;
  cost_tokens: number;
  cost_extra: number;
  cost_total: number;
  margin_eur: number;
  margin_pct: number | null;
  eur_per_hour: number | null;
  collected: number;
  pending: number;
  overdue: number;
  tasks_done: number;
  tasks_total: number;
};

export type ProjectRow = {
  id: string;
  code: string;
  name: string;
  status: ProjectStatusKey;
  level: number;
  client_id: string;
  price_net: number;
  vat_rate: number;
  estimated_hours: number | null;
  payment_mode: "unico" | "plazos";
  installments: number | null;
  down_payment: number | null;
  started_at: string | null;
  delivered_at: string | null;
};

export type ClientOption = {
  id: string;
  business_name: string;
};

export type ProjectDocumentRow = {
  id: string;
  kind: DocumentKindKey;
  label: string | null;
  url: string;
};

export type ProjectDetailData = {
  project: ProjectRow;
  totals: ProjectTotals;
  client: ClientOption;
  clients: ClientOption[];
  documents: ProjectDocumentRow[];
  payments: PaymentListRow[];
  expenses: ProjectExpenseRow[];
  vatEnabled: boolean;
  vatDefaultRate: number;
};

const TOTALS_COLUMNS =
  "project_id,name,status,level,client_id,price_net,price_gross,estimated_hours,minutes_total,hours_total,cost_tokens,cost_extra,cost_total,margin_eur,margin_pct,eur_per_hour,collected,pending,overdue,tasks_done,tasks_total";

export async function getProjectsList({
  q,
}: {
  q?: string;
}): Promise<{ rows: ProjectListRow[]; counts: ProjectStatusCounts }> {
  const supabase = await createClient();
  const term = (q ?? "").trim().toLowerCase();

  const [projectsResult, clientsResult, totalsResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id,code,name,status,level,price_net,client_id")
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("id,business_name"),
    supabase
      .from("v_project_totals")
      .select("project_id,minutes_total,hours_total,pending,tasks_done,tasks_total"),
  ]);

  if (projectsResult.error) throw new Error(projectsResult.error.message);
  if (clientsResult.error) throw new Error(clientsResult.error.message);
  if (totalsResult.error) throw new Error(totalsResult.error.message);

  const businessByClient = new Map<string, string>();
  for (const client of clientsResult.data ?? []) {
    businessByClient.set(client.id, client.business_name);
  }

  const totalsByProject = new Map<
    string,
    NonNullable<typeof totalsResult.data>[number]
  >();
  for (const totals of totalsResult.data ?? []) {
    if (totals.project_id) totalsByProject.set(totals.project_id, totals);
  }

  const rows: ProjectListRow[] = (projectsResult.data ?? []).map((project) => {
    const totals = totalsByProject.get(project.id);
    return {
      id: project.id,
      code: project.code,
      name: project.name,
      status: project.status,
      level: project.level,
      price_net: project.price_net,
      client_id: project.client_id,
      business_name: businessByClient.get(project.client_id) ?? "",
      minutes_total: totals?.minutes_total ?? 0,
      hours_total: totals?.hours_total ?? 0,
      pending: totals?.pending ?? 0,
      tasks_done: totals?.tasks_done ?? 0,
      tasks_total: totals?.tasks_total ?? 0,
    };
  });

  const filtered = term
    ? rows.filter(
        (row) =>
          row.name.toLowerCase().includes(term) ||
          row.business_name.toLowerCase().includes(term),
      )
    : rows;

  const counts: ProjectStatusCounts = {
    todos: 0,
    a_empezar: 0,
    en_desarrollo: 0,
    terminado: 0,
    cancelado: 0,
  };
  for (const row of filtered) {
    counts[row.status] += 1;
    if (row.status !== "cancelado") counts.todos += 1;
  }

  return { rows: filtered, counts };
}

export async function getClientOptions(): Promise<ClientOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id,business_name")
    .order("business_name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getProjectDetail(
  id: string,
): Promise<ProjectDetailData | null> {
  const supabase = await createClient();

  const projectResult = await supabase
    .from("projects")
    .select(
      "id,code,name,status,level,client_id,price_net,vat_rate,estimated_hours,payment_mode,installments,down_payment,started_at,delivered_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (projectResult.error) throw new Error(projectResult.error.message);
  if (!projectResult.data) return null;

  const [totalsResult, clientResult, documentsResult, settingsResult, clients, payments, expenses] =
    await Promise.all([
      supabase
        .from("v_project_totals")
        .select(TOTALS_COLUMNS)
        .eq("project_id", id)
        .maybeSingle(),
      supabase
        .from("clients")
        .select("id,business_name")
        .eq("id", projectResult.data.client_id)
        .maybeSingle(),
      supabase
        .from("documents")
        .select("id,kind,label,url")
        .eq("project_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("app_settings")
        .select("vat_enabled,vat_default_rate")
        .maybeSingle(),
      getClientOptions(),
      getProjectPayments(id),
      getProjectExpenses(id),
    ]);

  if (totalsResult.error) throw new Error(totalsResult.error.message);
  if (documentsResult.error) throw new Error(documentsResult.error.message);

  const project = projectResult.data;
  const totals = totalsResult.data;

  return {
    project,
    totals: {
      project_id: id,
      name: totals?.name ?? project.name,
      status: totals?.status ?? project.status,
      level: totals?.level ?? project.level,
      client_id: totals?.client_id ?? project.client_id,
      price_net: totals?.price_net ?? project.price_net,
      price_gross:
        totals?.price_gross ??
        Math.round(project.price_net * (1 + project.vat_rate / 100) * 100) / 100,
      estimated_hours: totals?.estimated_hours ?? project.estimated_hours,
      minutes_total: totals?.minutes_total ?? 0,
      hours_total: totals?.hours_total ?? 0,
      cost_tokens: totals?.cost_tokens ?? 0,
      cost_extra: totals?.cost_extra ?? 0,
      cost_total: totals?.cost_total ?? 0,
      margin_eur: totals?.margin_eur ?? 0,
      margin_pct: totals?.margin_pct ?? null,
      eur_per_hour: totals?.eur_per_hour ?? null,
      collected: totals?.collected ?? 0,
      pending: totals?.pending ?? 0,
      overdue: totals?.overdue ?? 0,
      tasks_done: totals?.tasks_done ?? 0,
      tasks_total: totals?.tasks_total ?? 0,
    },
    client: clientResult.data ?? { id: project.client_id, business_name: "" },
    clients,
    documents: documentsResult.data ?? [],
    payments,
    expenses,
    vatEnabled: settingsResult.data?.vat_enabled ?? false,
    vatDefaultRate: settingsResult.data?.vat_default_rate ?? 0,
  };
}
