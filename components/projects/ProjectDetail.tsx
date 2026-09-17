"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ChevronRight, Trash2 } from "lucide-react";
import { projectSchema } from "@/lib/schemas/project";
import type {
  ProjectFormResult,
  ProjectFormValues,
} from "@/lib/schemas/project";
import { updateProject } from "@/lib/actions/projects";
import {
  generatePaymentPlan,
  type PaymentPlanRowInput,
} from "@/lib/actions/payments";
import { EditableSection } from "@/components/shared/EditableSection";
import { FieldList, type FieldItem } from "@/components/shared/FieldList";
import { HoursText } from "@/components/shared/HoursText";
import { MoneyText } from "@/components/shared/MoneyText";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { ProjectDocuments } from "@/components/projects/ProjectDocuments";
import { ProjectProgressBar } from "@/components/projects/ProjectProgressBar";
import { ArchiveProjectDialog } from "@/components/projects/ArchiveProjectDialog";
import { ProjectExpensesBlock } from "@/components/expenses/ProjectExpensesBlock";
import {
  PaymentPlanEditor,
  toPlanRows,
  type PlanRow,
} from "@/components/payments/PaymentPlanEditor";
import { PaymentsTable } from "@/components/payments/PaymentsTable";
import { formatDate, formatEUR, formatPercent } from "@/lib/format";
import type { ProjectDetailData } from "@/lib/queries/projects";

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[11px] font-medium tracking-wide text-muted uppercase">
      {children}
    </h3>
  );
}

function ResumenCard({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-subtle bg-surface p-3.5">
      <p className="text-[11px] font-medium tracking-wide text-muted uppercase">
        {label}
      </p>
      <div className="mt-1.5 text-[16px] text-primary">{children}</div>
    </div>
  );
}

// Los valores vigilados del formulario llegan como texto del input.
function toNumberOrUndefined(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

// Ficha de proyecto completa. Único componente compartido por la página
// completa y por el panel lateral interceptado (D-18).
export function ProjectDetail({
  project,
  totals,
  client,
  clients,
  documents,
  payments,
  expenses,
  vatEnabled,
}: ProjectDetailData) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const form = useForm<ProjectFormValues, unknown, ProjectFormResult>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      client_id: project.client_id,
      name: project.name,
      level: project.level,
      status: project.status,
      price_net: project.price_net,
      vat_rate: project.vat_rate,
      estimated_hours: project.estimated_hours ?? undefined,
      payment_mode: project.payment_mode,
      installments: project.installments ?? undefined,
      down_payment: project.down_payment ?? undefined,
      started_at: project.started_at ?? undefined,
      delivered_at: project.delivered_at ?? undefined,
    },
  });

  // Borrador del plan de pagos (6.1). Solo toca la base al Guardar, a través
  // de generatePaymentPlan, que nunca borra las filas ya cobradas.
  const initialPlanRows = useMemo(() => toPlanRows(payments), [payments]);
  const [planDraft, setPlanDraft] = useState<PlanRow[]>(initialPlanRows);

  useEffect(() => {
    if (!editing) setPlanDraft(initialPlanRows);
  }, [editing, initialPlanRows]);

  const planDirty = useMemo(() => {
    const serialize = (rows: PlanRow[]) =>
      rows
        .map(
          (row) =>
            `${row.id ?? ""}|${row.label}|${row.amount}|${row.due_date}|${row.paid}`,
        )
        .join("\n");
    return serialize(planDraft) !== serialize(initialPlanRows);
  }, [planDraft, initialPlanRows]);

  async function handleSave(values: ProjectFormResult) {
    const invalidRow = planDirty
      ? planDraft.some(
          (row) =>
            !row.paid &&
            (Number.isFinite(Number(row.amount)) === false ||
              Number(row.amount) <= 0 ||
              row.due_date === ""),
        )
      : false;
    if (invalidRow) {
      toast.error("Revisa el importe y la fecha de cada fila del plan.");
      return;
    }

    setSaving(true);
    const result = await updateProject(project.id, values);
    if (!result.ok) {
      setSaving(false);
      if (result.fieldErrors) {
        for (const [key, message] of Object.entries(result.fieldErrors)) {
          form.setError(key as Parameters<typeof form.setError>[0], { message });
        }
        toast.error("Revisa los campos marcados.");
      } else {
        toast.error(result.error ?? "No se pudo guardar el proyecto.");
      }
      return;
    }

    if (planDirty) {
      const planRows: PaymentPlanRowInput[] = planDraft
        .filter((row) => !row.paid)
        .map((row) => ({
          id: row.id ?? undefined,
          label: row.label.trim() || undefined,
          amount: Number(row.amount),
          due_date: row.due_date,
          paid: false,
        }));
      const planResult = await generatePaymentPlan(project.id, planRows);
      if (!planResult.ok) {
        setSaving(false);
        toast.error(
          planResult.error ?? "No se pudo guardar el plan de pagos.",
        );
        return;
      }
    }

    setSaving(false);
    toast.success("Cambios guardados");
    form.reset(values);
    setEditing(false);
    router.refresh();
  }

  function handleCancelEdit() {
    setEditing(false);
    form.reset();
  }

  const fields: FieldItem[] = [
    {
      label: "Cliente",
      value: (
        <Link
          href={`/contactos/${client.id}`}
          className="text-accent hover:underline"
        >
          {client.business_name}
        </Link>
      ),
    },
    { label: "Nivel", value: `Nivel ${project.level}` },
    { label: "Estado", value: <StatusBadge status={project.status} /> },
    { label: "Precio (sin IVA)", value: <MoneyText value={totals.price_net} /> },
    ...(vatEnabled
      ? [
          { label: "IVA", value: formatPercent(project.vat_rate) },
          {
            label: "Precio con IVA",
            value: <MoneyText value={totals.price_gross} />,
          },
        ]
      : []),
    {
      label: "Horas estimadas",
      value:
        project.estimated_hours !== null ? (
          <HoursText minutes={project.estimated_hours * 60} />
        ) : null,
    },
    {
      label: "Fecha de inicio",
      value: project.started_at ? formatDate(project.started_at) : null,
    },
    {
      label: "Fecha de entrega",
      value: project.delivered_at ? formatDate(project.delivered_at) : null,
    },
  ];

  return (
    <div className="space-y-8">
      <EditableSection
        editing={editing}
        isDirty={form.formState.isDirty}
        isSaving={saving}
        onEdit={() => setEditing(true)}
        onCancel={handleCancelEdit}
        onSave={() => void form.handleSubmit(handleSave)()}
        actions={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-negative hover:text-negative"
            onClick={() => setArchiveOpen(true)}
          >
            <Trash2 aria-hidden strokeWidth={1.5} />
            Eliminar
          </Button>
        }
        title={
          <div className="space-y-1.5">
            <h2 className="font-display text-[28px] leading-tight font-semibold tracking-[-0.02em] text-primary">
              {project.name} <span className="text-muted">—</span>{" "}
              <Link
                href={`/contactos/${client.id}`}
                className="text-accent hover:underline"
              >
                {client.business_name}
              </Link>
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-secondary">
              <StatusBadge status={project.status} />
              <span className="num text-muted">{project.code}</span>
              <span>Nivel {project.level}</span>
            </div>
          </div>
        }
      >
        {editing ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void form.handleSubmit(handleSave)(event);
            }}
            noValidate
          >
            <ProjectForm
              form={form}
              mode="edit"
              clients={clients}
              vatEnabled={vatEnabled}
            />
          </form>
        ) : (
          <FieldList fields={fields} />
        )}
      </EditableSection>

      <section className="space-y-2.5">
        <SectionHeading>Resumen</SectionHeading>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <ResumenCard label="Precio">
            <MoneyText value={totals.price_net} />
          </ResumenCard>
          <ResumenCard label="Horas">
            <HoursText minutes={totals.minutes_total} />
          </ResumenCard>
          <ResumenCard label="Coste total">
            <MoneyText value={totals.cost_total} />
          </ResumenCard>
          <ResumenCard label="Margen">
            <MoneyText value={totals.margin_eur} />
            {totals.margin_pct !== null ? (
              <span className="num mt-0.5 block text-[11px] text-secondary">
                {formatPercent(totals.margin_pct)}
              </span>
            ) : null}
          </ResumenCard>
          <ResumenCard label="€/hora">
            <MoneyText value={totals.eur_per_hour} />
          </ResumenCard>
          <ResumenCard label="Cobrado / Pendiente">
            <span className="num text-[13px]">
              {formatEUR(totals.collected)} / {formatEUR(totals.pending)}
            </span>
          </ResumenCard>
        </div>
      </section>

      <ProjectDocuments projectId={project.id} documents={documents} />

      <section className="space-y-2.5">
        <SectionHeading>Tareas</SectionHeading>
        <Link
          href={`/proyectos/${project.id}/tareas`}
          className="block rounded-lg border border-subtle bg-surface p-4 transition-colors hover:bg-hover"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-primary">
                {totals.tasks_done} de 9 finalizadas
              </p>
              <p className="num mt-0.5 text-xs text-secondary">
                <HoursText minutes={totals.minutes_total} /> acumuladas
              </p>
            </div>
            <ChevronRight
              aria-hidden
              className="size-4 shrink-0 text-muted"
              strokeWidth={1.5}
            />
          </div>
          <ProjectProgressBar done={totals.tasks_done} className="mt-3" />
        </Link>
      </section>

      <section className="space-y-2.5">
        <SectionHeading>Pagos</SectionHeading>
        {editing ? (
          <PaymentPlanEditor
            config={{
              price_net: Number.isFinite(Number(form.watch("price_net")))
                ? Number(form.watch("price_net"))
                : 0,
              payment_mode: form.watch("payment_mode") ?? "unico",
              installments: toNumberOrUndefined(form.watch("installments")),
              down_payment: toNumberOrUndefined(form.watch("down_payment")),
            }}
            initialRows={initialPlanRows}
            onChange={setPlanDraft}
          />
        ) : (
          <PaymentsTable projectId={project.id} initialPayments={payments} />
        )}
      </section>

      <ProjectExpensesBlock
        projectId={project.id}
        expenses={expenses}
        totals={totals}
      />

      <ArchiveProjectDialog
        projectId={project.id}
        projectName={project.name}
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
      />
    </div>
  );
}
