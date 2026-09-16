import { createClient } from "@/lib/supabase/server";
import type {
  CLIENT_STATUS_KEYS,
  PROJECT_STATUS_KEYS,
} from "@/lib/constants/statuses";

export type ClientStatusKey = (typeof CLIENT_STATUS_KEYS)[number];
export type ProjectStatusKey = (typeof PROJECT_STATUS_KEYS)[number];
export type ClientStatusCounts = Record<ClientStatusKey | "todos", number>;

export type ClientListRow = {
  id: string;
  business_name: string;
  contact_name: string | null;
  phone: string | null;
  business_type: string | null;
  status: ClientStatusKey;
  projects_count: number;
};

export type ClientRow = {
  id: string;
  business_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  business_type: string | null;
  status: ClientStatusKey;
  notes: string | null;
  last_contact_at: string | null;
};

export type ClientProjectRow = {
  id: string;
  name: string;
  status: ProjectStatusKey;
  price_net: number;
};

export type ClientNoteRow = {
  id: string;
  note_date: string;
  body: string;
};

export type ClientDetailData = {
  client: ClientRow;
  informeUrl: string | null;
  projects: ClientProjectRow[];
  notes: ClientNoteRow[];
  businessTypes: string[];
};

function sanitizeSearchTerm(term: string): string {
  // PostgREST interpreta comas y paréntesis dentro de la expresión .or()
  return term.replace(/[,()]/g, " ").trim();
}

export async function getClientsList({
  q,
}: {
  q?: string;
}): Promise<{ rows: ClientListRow[]; counts: ClientStatusCounts }> {
  const supabase = await createClient();
  const term = sanitizeSearchTerm((q ?? "").trim());

  let clientsQuery = supabase
    .from("clients")
    .select(
      "id,business_name,contact_name,phone,business_type,status",
    );
  if (term) {
    clientsQuery = clientsQuery.or(
      `business_name.ilike.%${term}%,phone.ilike.%${term}%,phone_e164.ilike.%${term}%,business_type.ilike.%${term}%`,
    );
  }
  clientsQuery = clientsQuery.order("business_name", { ascending: true });

  const [clientsResult, projectsResult] = await Promise.all([
    clientsQuery,
    supabase.from("projects").select("client_id"),
  ]);

  if (clientsResult.error) throw new Error(clientsResult.error.message);
  if (projectsResult.error) throw new Error(projectsResult.error.message);

  const countByClient = new Map<string, number>();
  for (const row of projectsResult.data ?? []) {
    countByClient.set(
      row.client_id,
      (countByClient.get(row.client_id) ?? 0) + 1,
    );
  }

  const counts: ClientStatusCounts = {
    todos: 0,
    potencial: 0,
    en_proceso: 0,
    terminado: 0,
    nada: 0,
  };
  const rows: ClientListRow[] = (clientsResult.data ?? []).map((row) => {
    counts[row.status] += 1;
    counts.todos += 1;
    return {
      id: row.id,
      business_name: row.business_name,
      contact_name: row.contact_name,
      phone: row.phone,
      business_type: row.business_type,
      status: row.status,
      projects_count: countByClient.get(row.id) ?? 0,
    };
  });

  return { rows, counts };
}

export async function getBusinessTypes(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("business_type")
    .not("business_type", "is", null);
  if (error) throw new Error(error.message);

  const unique = new Set<string>();
  for (const row of data ?? []) {
    if (row.business_type) unique.add(row.business_type);
  }
  return [...unique].sort((a, b) => a.localeCompare(b, "es"));
}

export async function getClientDetail(
  id: string,
): Promise<ClientDetailData | null> {
  const supabase = await createClient();

  const [clientResult, documentResult, projectsResult, notesResult, businessTypes] =
    await Promise.all([
      supabase
        .from("clients")
        .select(
          "id,business_name,contact_name,phone,email,business_type,status,notes,last_contact_at",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("documents")
        .select("id,url")
        .eq("client_id", id)
        .eq("kind", "informe_cliente")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("projects")
        .select("id,name,status,price_net")
        .eq("client_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("client_notes")
        .select("id,note_date,body")
        .eq("client_id", id)
        .order("note_date", { ascending: false })
        .order("created_at", { ascending: false }),
      getBusinessTypes(),
    ]);

  if (clientResult.error) throw new Error(clientResult.error.message);
  if (!clientResult.data) return null;

  if (projectsResult.error) throw new Error(projectsResult.error.message);
  if (notesResult.error) throw new Error(notesResult.error.message);

  return {
    client: clientResult.data,
    informeUrl: documentResult.data?.url ?? null,
    projects: projectsResult.data ?? [],
    notes: notesResult.data ?? [],
    businessTypes,
  };
}