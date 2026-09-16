export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string
          currency: string
          google_calendar_id: string | null
          ics_token: string
          owner_id: string
          reminder_days_before: number
          reminder_time: string
          target_hourly_rate: number | null
          timezone: string
          updated_at: string
          vat_default_rate: number
          vat_enabled: boolean
          wip_limit: number
        }
        Insert: {
          created_at?: string
          currency?: string
          google_calendar_id?: string | null
          ics_token?: string
          owner_id: string
          reminder_days_before?: number
          reminder_time?: string
          target_hourly_rate?: number | null
          timezone?: string
          updated_at?: string
          vat_default_rate?: number
          vat_enabled?: boolean
          wip_limit?: number
        }
        Update: {
          created_at?: string
          currency?: string
          google_calendar_id?: string | null
          ics_token?: string
          owner_id?: string
          reminder_days_before?: number
          reminder_time?: string
          target_hourly_rate?: number | null
          timezone?: string
          updated_at?: string
          vat_default_rate?: number
          vat_enabled?: boolean
          wip_limit?: number
        }
        Relationships: []
      }
      business_expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["business_expense_category"]
          concept: string
          created_at: string
          ends_on: string | null
          id: string
          notes: string | null
          owner_id: string
          recurrence: Database["public"]["Enums"]["expense_recurrence"]
          starts_on: string
          updated_at: string
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["business_expense_category"]
          concept: string
          created_at?: string
          ends_on?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          recurrence?: Database["public"]["Enums"]["expense_recurrence"]
          starts_on?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["business_expense_category"]
          concept?: string
          created_at?: string
          ends_on?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          recurrence?: Database["public"]["Enums"]["expense_recurrence"]
          starts_on?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_notes: {
        Row: {
          body: string
          client_id: string
          created_at: string
          id: string
          note_date: string
          owner_id: string
        }
        Insert: {
          body: string
          client_id: string
          created_at?: string
          id?: string
          note_date?: string
          owner_id?: string
        }
        Update: {
          body?: string
          client_id?: string
          created_at?: string
          id?: string
          note_date?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_totals"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_payments"
            referencedColumns: ["client_id"]
          },
        ]
      }
      clients: {
        Row: {
          business_name: string
          business_type: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          last_contact_at: string | null
          notes: string | null
          owner_id: string
          phone: string | null
          phone_e164: string | null
          status: Database["public"]["Enums"]["client_status"]
          updated_at: string
        }
        Insert: {
          business_name: string
          business_type?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_contact_at?: string | null
          notes?: string | null
          owner_id?: string
          phone?: string | null
          phone_e164?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
        }
        Update: {
          business_name?: string
          business_type?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_contact_at?: string | null
          notes?: string | null
          owner_id?: string
          phone?: string | null
          phone_e164?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["document_kind"]
          label: string | null
          owner_id: string
          project_id: string | null
          updated_at: string
          url: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["document_kind"]
          label?: string | null
          owner_id?: string
          project_id?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["document_kind"]
          label?: string | null
          owner_id?: string
          project_id?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_totals"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_payments"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_totals"
            referencedColumns: ["project_id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          google_event_id: string | null
          id: string
          label: string | null
          method: string | null
          owner_id: string
          paid_at: string | null
          project_id: string
          seq: number
          sync_error: string | null
          sync_state: Database["public"]["Enums"]["sync_state"]
          synced_at: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          google_event_id?: string | null
          id?: string
          label?: string | null
          method?: string | null
          owner_id?: string
          paid_at?: string | null
          project_id: string
          seq: number
          sync_error?: string | null
          sync_state?: Database["public"]["Enums"]["sync_state"]
          synced_at?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          google_event_id?: string | null
          id?: string
          label?: string | null
          method?: string | null
          owner_id?: string
          paid_at?: string | null
          project_id?: string
          seq?: number
          sync_error?: string | null
          sync_state?: Database["public"]["Enums"]["sync_state"]
          synced_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_totals"
            referencedColumns: ["project_id"]
          },
        ]
      }
      project_expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["project_expense_category"]
          concept: string
          created_at: string
          id: string
          incurred_on: string
          owner_id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["project_expense_category"]
          concept: string
          created_at?: string
          id?: string
          incurred_on?: string
          owner_id?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["project_expense_category"]
          concept?: string
          created_at?: string
          id?: string
          incurred_on?: string
          owner_id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_totals"
            referencedColumns: ["project_id"]
          },
        ]
      }
      projects: {
        Row: {
          cancelled_at: string | null
          client_id: string
          code: string
          created_at: string
          delivered_at: string | null
          down_payment: number | null
          estimated_hours: number | null
          id: string
          installments: number | null
          level: number
          name: string
          owner_id: string
          payment_mode: Database["public"]["Enums"]["payment_mode"]
          price_net: number
          started_at: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
          vat_rate: number
        }
        Insert: {
          cancelled_at?: string | null
          client_id: string
          code: string
          created_at?: string
          delivered_at?: string | null
          down_payment?: number | null
          estimated_hours?: number | null
          id?: string
          installments?: number | null
          level?: number
          name: string
          owner_id?: string
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          price_net?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          cancelled_at?: string | null
          client_id?: string
          code?: string
          created_at?: string
          delivered_at?: string | null
          down_payment?: number | null
          estimated_hours?: number | null
          id?: string
          installments?: number | null
          level?: number
          name?: string
          owner_id?: string
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          price_net?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_totals"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_payments"
            referencedColumns: ["client_id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed_at: string | null
          cost_eur: number | null
          created_at: string
          id: string
          minutes: number | null
          owner_id: string
          phase: Database["public"]["Enums"]["task_phase"] | null
          position: number
          project_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          cost_eur?: number | null
          created_at?: string
          id?: string
          minutes?: number | null
          owner_id?: string
          phase?: Database["public"]["Enums"]["task_phase"] | null
          position: number
          project_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          cost_eur?: number | null
          created_at?: string
          id?: string
          minutes?: number | null
          owner_id?: string
          phase?: Database["public"]["Enums"]["task_phase"] | null
          position?: number
          project_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_totals"
            referencedColumns: ["project_id"]
          },
        ]
      }
    }
    Views: {
      v_business_expense_months: {
        Row: {
          amount: number | null
          category:
            | Database["public"]["Enums"]["business_expense_category"]
            | null
          concept: string | null
          expense_id: string | null
          month: string | null
          owner_id: string | null
        }
        Relationships: []
      }
      v_client_totals: {
        Row: {
          billed_total: number | null
          business_name: string | null
          client_id: string | null
          collected: number | null
          hours_total: number | null
          margin_eur: number | null
          owner_id: string | null
          pending: number | null
          projects_count: number | null
          status: Database["public"]["Enums"]["client_status"] | null
        }
        Relationships: []
      }
      v_db_general: {
        Row: {
          "C / AJUSTES": number | null
          "C / AUDITORIAS": number | null
          "C / BUGS": number | null
          "C / FASES": number | null
          "C / PLANIFICACION": number | null
          "C / RETOQUES": number | null
          CLIENTE: string | null
          NIVEL: number | null
          "NOMBRE DEL PROYECTO": string | null
          owner_id: string | null
          PRECIO: number | null
          PROYECTO: string | null
          "SUM COSTES": number | null
          "SUM TIEMPO": number | null
          "T / AJUSTES": number | null
          "T / AUDITORIAS": number | null
          "T / BUGS": number | null
          "T / FASES": number | null
          "T / INICIAL CON CLIENTE": number | null
          "T / PLANIFICACION": number | null
          "T / PROBANDO": number | null
          "T / RETOQUES": number | null
          "T / REVISION CLIENTE": number | null
          "TELEFONO CLIENTE": string | null
        }
        Relationships: []
      }
      v_monthly_cash: {
        Row: {
          business_expenses: number | null
          collected: number | null
          cost_tokens: number | null
          month: string | null
          net_profit: number | null
          pending_overdue: number | null
          project_expenses: number | null
        }
        Relationships: []
      }
      v_payments: {
        Row: {
          amount: number | null
          client_business_name: string | null
          client_id: string | null
          days_overdue: number | null
          due_date: string | null
          google_event_id: string | null
          id: string | null
          label: string | null
          method: string | null
          owner_id: string | null
          paid_at: string | null
          project_code: string | null
          project_id: string | null
          project_name: string | null
          seq: number | null
          status: string | null
          sync_error: string | null
          sync_state: Database["public"]["Enums"]["sync_state"] | null
          synced_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_totals"
            referencedColumns: ["project_id"]
          },
        ]
      }
      v_phase_stats: {
        Row: {
          cost_avg: number | null
          cost_median: number | null
          cost_n: number | null
          level: number | null
          minutes_avg: number | null
          minutes_median: number | null
          minutes_n: number | null
          owner_id: string | null
          phase: Database["public"]["Enums"]["task_phase"] | null
        }
        Relationships: []
      }
      v_project_funnel: {
        Row: {
          conversion_finished_pct: number | null
          conversion_in_process_pct: number | null
          finished: number | null
          in_process: number | null
          none_status: number | null
          owner_id: string | null
          potentials: number | null
          total: number | null
        }
        Relationships: []
      }
      v_project_totals: {
        Row: {
          client_id: string | null
          code: string | null
          collected: number | null
          cost_extra: number | null
          cost_tokens: number | null
          cost_total: number | null
          estimated_hours: number | null
          eur_per_hour: number | null
          hours_deviation_pct: number | null
          hours_total: number | null
          level: number | null
          margin_eur: number | null
          margin_pct: number | null
          minutes_total: number | null
          name: string | null
          overdue: number | null
          owner_id: string | null
          pending: number | null
          price_gross: number | null
          price_net: number | null
          project_id: string | null
          status: Database["public"]["Enums"]["project_status"] | null
          tasks_done: number | null
          tasks_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_totals"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_payments"
            referencedColumns: ["client_id"]
          },
        ]
      }
      v_receivables_aging: {
        Row: {
          amount_total: number | null
          bucket: string | null
          owner_id: string | null
          payments_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      business_expense_category:
        | "ia_tokens"
        | "software"
        | "hosting"
        | "dominio"
        | "hardware"
        | "gestoria"
        | "impuestos"
        | "formacion"
        | "otros"
      client_status: "potencial" | "en_proceso" | "terminado" | "nada"
      document_kind:
        | "informe_cliente"
        | "informe_proyecto"
        | "contrato"
        | "repositorio"
        | "pys"
        | "guia_uso"
        | "otro"
      expense_recurrence: "unico" | "mensual" | "trimestral" | "anual"
      payment_mode: "unico" | "plazos"
      project_expense_category:
        | "suscripcion"
        | "licencia"
        | "dominio"
        | "hosting"
        | "subcontrata"
        | "hardware"
        | "software"
        | "otros"
      project_status: "a_empezar" | "en_desarrollo" | "terminado" | "cancelado"
      sync_state: "pendiente" | "sincronizado" | "error" | "no_aplica"
      task_phase:
        | "inicio_cliente"
        | "planificacion"
        | "fases"
        | "bugs"
        | "probando"
        | "ajustes"
        | "revision_cliente"
        | "retoques"
        | "auditorias"
      task_status: "todo" | "doing" | "done"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      business_expense_category: [
        "ia_tokens",
        "software",
        "hosting",
        "dominio",
        "hardware",
        "gestoria",
        "impuestos",
        "formacion",
        "otros",
      ],
      client_status: ["potencial", "en_proceso", "terminado", "nada"],
      document_kind: [
        "informe_cliente",
        "informe_proyecto",
        "contrato",
        "repositorio",
        "pys",
        "guia_uso",
        "otro",
      ],
      expense_recurrence: ["unico", "mensual", "trimestral", "anual"],
      payment_mode: ["unico", "plazos"],
      project_expense_category: [
        "suscripcion",
        "licencia",
        "dominio",
        "hosting",
        "subcontrata",
        "hardware",
        "software",
        "otros",
      ],
      project_status: ["a_empezar", "en_desarrollo", "terminado", "cancelado"],
      sync_state: ["pendiente", "sincronizado", "error", "no_aplica"],
      task_phase: [
        "inicio_cliente",
        "planificacion",
        "fases",
        "bugs",
        "probando",
        "ajustes",
        "revision_cliente",
        "retoques",
        "auditorias",
      ],
      task_status: ["todo", "doing", "done"],
    },
  },
} as const
