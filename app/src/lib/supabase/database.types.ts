/**
 * Tipos do banco, gerados do Supabase (projeto Atreides) em 21/11/2026.
 * Ajustes manuais: `created_by`, `calendar_owner_id` e o `workspace_id` de documentos e anotações
 * são opcionais na inserção,
 * porque o próprio banco preenche esses campos (gatilhos).
 * Ao gerar de novo, reaplicar esses ajustes.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" };
  public: {
    Tables: {
      assets: {
        Row: { id: string; ticker: string | null; name: string; asset_class: Database["public"]["Enums"]["asset_class"]; kind: Database["public"]["Enums"]["asset_kind"]; issuer: string | null; created_by: string; created_at: string };
        Insert: { id?: string; ticker?: string | null; name: string; asset_class: Database["public"]["Enums"]["asset_class"]; kind: Database["public"]["Enums"]["asset_kind"]; issuer?: string | null; created_by?: string; created_at?: string };
        Update: { ticker?: string | null; name?: string; asset_class?: Database["public"]["Enums"]["asset_class"]; kind?: Database["public"]["Enums"]["asset_kind"]; issuer?: string | null };
        Relationships: [];
      };
      asset_quotes: {
        Row: { asset_id: string; price: number; change_pct: number | null; currency: string; quoted_at: string; source: string; fetched_at: string };
        Insert: { asset_id: string; price: number; change_pct?: number | null; currency?: string; quoted_at: string; source: string; fetched_at?: string };
        Update: { price?: number; change_pct?: number | null; currency?: string; quoted_at?: string; source?: string; fetched_at?: string };
        Relationships: [{ foreignKeyName: "asset_quotes_asset_id_fkey"; columns: ["asset_id"]; isOneToOne: false; referencedRelation: "assets"; referencedColumns: ["id"] }];
      };
      portfolio_targets: {
        Row: { client_id: string; asset_class: Database["public"]["Enums"]["asset_class"]; target_pct: number; updated_by: string | null; updated_at: string };
        Insert: { client_id: string; asset_class: Database["public"]["Enums"]["asset_class"]; target_pct: number; updated_by?: string | null; updated_at?: string };
        Update: { target_pct?: number; updated_by?: string | null; updated_at?: string };
        Relationships: [];
      };
      contributions: {
        Row: { id: string; client_id: string; workspace_id: string; period_kind: Database["public"]["Enums"]["portfolio_frequency"]; period_start: string; status: Database["public"]["Enums"]["contribution_status"]; notes: string | null; executed_at: string | null; executed_on: string | null; created_by: string; created_at: string };
        Insert: { id?: string; client_id: string; workspace_id?: string; period_kind: Database["public"]["Enums"]["portfolio_frequency"]; period_start: string; status?: Database["public"]["Enums"]["contribution_status"]; notes?: string | null; created_by?: string };
        Update: { period_kind?: Database["public"]["Enums"]["portfolio_frequency"]; period_start?: string; status?: Database["public"]["Enums"]["contribution_status"]; notes?: string | null; executed_on?: string | null };
        Relationships: [{ foreignKeyName: "contributions_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"] }];
      };
      contribution_items: {
        Row: { id: string; contribution_id: string; asset_id: string; quantity: number; unit_price: number; amount: number; created_at: string };
        Insert: { id?: string; contribution_id: string; asset_id: string; quantity: number; unit_price: number };
        Update: { quantity?: number; unit_price?: number };
        Relationships: [{ foreignKeyName: "contribution_items_contribution_id_fkey"; columns: ["contribution_id"]; isOneToOne: false; referencedRelation: "contributions"; referencedColumns: ["id"] }, { foreignKeyName: "contribution_items_asset_id_fkey"; columns: ["asset_id"]; isOneToOne: false; referencedRelation: "assets"; referencedColumns: ["id"] }];
      };
      portfolio_transactions: {
        Row: { id: string; client_id: string; workspace_id: string; asset_id: string; type: Database["public"]["Enums"]["transaction_type"]; trade_date: string; quantity: number | null; unit_price: number | null; amount: number; institution: string | null; contribution_id: string | null; notes: string | null; created_by: string; created_at: string };
        Insert: { id?: string; client_id: string; workspace_id?: string; asset_id: string; type: Database["public"]["Enums"]["transaction_type"]; trade_date: string; quantity?: number | null; unit_price?: number | null; amount: number; institution?: string | null; contribution_id?: string | null; notes?: string | null; created_by?: string };
        Update: { notes?: string | null };
        Relationships: [{ foreignKeyName: "portfolio_transactions_asset_id_fkey"; columns: ["asset_id"]; isOneToOne: false; referencedRelation: "assets"; referencedColumns: ["id"] }, { foreignKeyName: "portfolio_transactions_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"] }, { foreignKeyName: "portfolio_transactions_contribution_id_fkey"; columns: ["contribution_id"]; isOneToOne: false; referencedRelation: "contributions"; referencedColumns: ["id"] }, { foreignKeyName: "portfolio_transactions_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }];
      };
      portfolio_valuations: {
        Row: { id: string; client_id: string; workspace_id: string; asset_id: string; ref_date: string; value: number; created_by: string; created_at: string };
        Insert: { id?: string; client_id: string; workspace_id?: string; asset_id: string; ref_date: string; value: number; created_by?: string };
        Update: { value?: number };
        Relationships: [{ foreignKeyName: "portfolio_valuations_asset_id_fkey"; columns: ["asset_id"]; isOneToOne: false; referencedRelation: "assets"; referencedColumns: ["id"] }];
      };
      portfolio_snapshots: {
        Row: { id: string; client_id: string; workspace_id: string; ref_date: string; total_value: number; invested_total: number; by_class: Json; positions: Json; created_by: string; created_at: string };
        Insert: { id?: string; client_id: string; workspace_id?: string; ref_date: string; total_value: number; invested_total: number; by_class?: Json; positions?: Json; created_by?: string };
        Update: { total_value?: number };
        Relationships: [{ foreignKeyName: "portfolio_snapshots_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }];
      };
      market_cache: {
        Row: { ticker: string; kind: string; data: Json; source: string; fetched_at: string };
        Insert: { ticker: string; kind: string; data: Json; source: string; fetched_at?: string };
        Update: { data?: Json; source?: string; fetched_at?: string };
        Relationships: [];
      };
      watchlist_items: {
        Row: { user_id: string; ticker: string; name: string; added_at: string };
        Insert: { user_id?: string; ticker: string; name: string; added_at?: string };
        Update: { name?: string };
        Relationships: [];
      };
      benchmark_rates: {
        Row: { series: string; ref_date: string; value: number };
        Insert: { series: string; ref_date: string; value: number };
        Update: { value?: number };
        Relationships: [];
      };
      reports: {
        Row: { id: string; client_id: string; workspace_id: string; period_start: string; period_end: string; status: Database["public"]["Enums"]["report_status"]; version: number; comment: string | null; data: Json | null; pdf_path: string | null; approved_by: string | null; approved_at: string | null; sent_at: string | null; sent_channels: string[]; sent_by: string | null; created_by: string; created_at: string; updated_at: string };
        Insert: { id?: string; client_id: string; workspace_id?: string; period_start: string; period_end: string; status?: Database["public"]["Enums"]["report_status"]; comment?: string | null; data?: Json | null; created_by?: string };
        Update: { status?: Database["public"]["Enums"]["report_status"]; comment?: string | null; data?: Json | null; pdf_path?: string | null; sent_at?: string | null; sent_channels?: string[] };
        Relationships: [
          { foreignKeyName: "reports_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"] },
          { foreignKeyName: "reports_approved_by_fkey"; columns: ["approved_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "reports_sent_by_fkey"; columns: ["sent_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "reports_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ];
      };
      audit_log: {
        Row: { action: string; after: Json | null; before: Json | null; created_at: string; id: number; record_id: string | null; table_name: string | null; user_id: string | null; workspace_id: string | null };
        Insert: { action: string; after?: Json | null; before?: Json | null; created_at?: string; id?: never; record_id?: string | null; table_name?: string | null; user_id?: string | null; workspace_id?: string | null };
        Update: { action?: string; after?: Json | null; before?: Json | null; created_at?: string; id?: never; record_id?: string | null; table_name?: string | null; user_id?: string | null; workspace_id?: string | null };
        Relationships: [
          { foreignKeyName: "audit_log_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "audit_log_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] },
        ];
      };
      client_documents: {
        Row: { category: Database["public"]["Enums"]["document_category"]; client_id: string; created_at: string; file_name: string; id: string; mime_type: string; size_bytes: number; storage_path: string; uploaded_by: string; workspace_id: string };
        Insert: { category: Database["public"]["Enums"]["document_category"]; client_id: string; created_at?: string; file_name: string; id?: string; mime_type: string; size_bytes: number; storage_path: string; uploaded_by?: string; workspace_id?: string };
        Update: { category?: Database["public"]["Enums"]["document_category"]; client_id?: string; created_at?: string; file_name?: string; id?: string; mime_type?: string; size_bytes?: number; storage_path?: string; uploaded_by?: string; workspace_id?: string };
        Relationships: [
          { foreignKeyName: "client_documents_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"] },
          { foreignKeyName: "client_documents_uploaded_by_fkey"; columns: ["uploaded_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "client_documents_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] },
        ];
      };
      client_events: {
        Row: { client_id: string; created_at: string; created_by: string | null; id: number; metadata: Json; summary: string | null; type: Database["public"]["Enums"]["client_event_type"]; workspace_id: string };
        Insert: { client_id: string; created_at?: string; created_by?: string | null; id?: never; metadata?: Json; summary?: string | null; type: Database["public"]["Enums"]["client_event_type"]; workspace_id: string };
        Update: { client_id?: string; created_at?: string; created_by?: string | null; id?: never; metadata?: Json; summary?: string | null; type?: Database["public"]["Enums"]["client_event_type"]; workspace_id?: string };
        Relationships: [
          { foreignKeyName: "client_events_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"] },
          { foreignKeyName: "client_events_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "client_events_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] },
        ];
      };
      client_notes: {
        Row: { body: string; client_id: string; created_at: string; created_by: string; id: string; pinned: boolean; updated_at: string; workspace_id: string };
        Insert: { body: string; client_id: string; created_at?: string; created_by?: string; id?: string; pinned?: boolean; updated_at?: string; workspace_id?: string };
        Update: { body?: string; client_id?: string; created_at?: string; created_by?: string; id?: string; pinned?: boolean; updated_at?: string; workspace_id?: string };
        Relationships: [
          { foreignKeyName: "client_notes_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"] },
          { foreignKeyName: "client_notes_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "client_notes_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] },
        ];
      };
      clients: {
        Row: {
          birth_date: string | null; city: string | null; closed_at: string | null; closing_reason: string | null; contract_start_on: string | null;
          cpf: string | null; created_at: string; created_by: string; declared_net_worth: number | null; email: string | null; family_id: string | null;
          family_role: Database["public"]["Enums"]["family_role"] | null; full_name: string; id: string;
          investor_profile: Database["public"]["Enums"]["investor_profile"] | null; lead_id: string | null; lgpd_consent_at: string | null;
          marital_status: Database["public"]["Enums"]["marital_status"] | null; migrated: boolean; monthly_income: number | null; notes: string | null;
          paused_at: string | null; phone: string | null; profession: string | null; profile_broker: string | null; profile_document_id: string | null; profile_note: string | null; profile_recorded_at: string | null; profile_recorded_by: string | null;
          referred_by: string | null; retain_until: string | null; source: Database["public"]["Enums"]["lead_source"] | null; state: string | null;
          status: Database["public"]["Enums"]["client_status"]; updated_at: string; workspace_id: string;
          portfolio_frequency: Database["public"]["Enums"]["portfolio_frequency"]; deviation_limit: number; report_frequency: Database["public"]["Enums"]["report_frequency"];
        };
        Insert: {
          birth_date?: string | null; city?: string | null; closed_at?: string | null; closing_reason?: string | null; contract_start_on?: string | null;
          cpf?: string | null; created_at?: string; created_by?: string; declared_net_worth?: number | null; email?: string | null; family_id?: string | null;
          family_role?: Database["public"]["Enums"]["family_role"] | null; full_name: string; id?: string;
          investor_profile?: Database["public"]["Enums"]["investor_profile"] | null; lead_id?: string | null; lgpd_consent_at?: string | null;
          marital_status?: Database["public"]["Enums"]["marital_status"] | null; migrated?: boolean; monthly_income?: number | null; notes?: string | null;
          paused_at?: string | null; phone?: string | null; profession?: string | null; profile_broker?: string | null; profile_document_id?: string | null; profile_note?: string | null; profile_recorded_at?: string | null; profile_recorded_by?: string | null;
          referred_by?: string | null; retain_until?: string | null; source?: Database["public"]["Enums"]["lead_source"] | null; state?: string | null;
          status?: Database["public"]["Enums"]["client_status"]; updated_at?: string; workspace_id: string;
          portfolio_frequency?: Database["public"]["Enums"]["portfolio_frequency"]; deviation_limit?: number; report_frequency?: Database["public"]["Enums"]["report_frequency"];
        };
        Update: {
          birth_date?: string | null; city?: string | null; closed_at?: string | null; closing_reason?: string | null; contract_start_on?: string | null;
          cpf?: string | null; created_at?: string; created_by?: string; declared_net_worth?: number | null; email?: string | null; family_id?: string | null;
          family_role?: Database["public"]["Enums"]["family_role"] | null; full_name?: string; id?: string;
          investor_profile?: Database["public"]["Enums"]["investor_profile"] | null; lead_id?: string | null; lgpd_consent_at?: string | null;
          marital_status?: Database["public"]["Enums"]["marital_status"] | null; migrated?: boolean; monthly_income?: number | null; notes?: string | null;
          paused_at?: string | null; phone?: string | null; profession?: string | null; profile_broker?: string | null; profile_document_id?: string | null; profile_note?: string | null; profile_recorded_at?: string | null; profile_recorded_by?: string | null;
          referred_by?: string | null; retain_until?: string | null; source?: Database["public"]["Enums"]["lead_source"] | null; state?: string | null;
          status?: Database["public"]["Enums"]["client_status"]; updated_at?: string; workspace_id?: string;
          portfolio_frequency?: Database["public"]["Enums"]["portfolio_frequency"]; deviation_limit?: number; report_frequency?: Database["public"]["Enums"]["report_frequency"];
        };
        Relationships: [
          { foreignKeyName: "clients_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "clients_family_id_fkey"; columns: ["family_id"]; isOneToOne: false; referencedRelation: "families"; referencedColumns: ["id"] },
          { foreignKeyName: "clients_lead_id_fkey"; columns: ["lead_id"]; isOneToOne: true; referencedRelation: "leads"; referencedColumns: ["id"] },
          { foreignKeyName: "clients_profile_document_id_fkey"; columns: ["profile_document_id"]; isOneToOne: false; referencedRelation: "client_documents"; referencedColumns: ["id"] },
          { foreignKeyName: "clients_profile_recorded_by_fkey"; columns: ["profile_recorded_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "clients_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] },
        ];
      };
      document_requirements: {
        Row: { category: Database["public"]["Enums"]["document_category"]; required: boolean };
        Insert: { category: Database["public"]["Enums"]["document_category"]; required?: boolean };
        Update: { category?: Database["public"]["Enums"]["document_category"]; required?: boolean };
        Relationships: [];
      };
      families: {
        Row: { created_at: string; created_by: string; id: string; name: string; workspace_id: string };
        Insert: { created_at?: string; created_by?: string; id?: string; name: string; workspace_id: string };
        Update: { created_at?: string; created_by?: string; id?: string; name?: string; workspace_id?: string };
        Relationships: [
          { foreignKeyName: "families_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "families_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] },
        ];
      };
      invitations: {
        Row: { accepted_at: string | null; created_at: string; email: string; full_name: string | null; invited_by: string | null; role: Database["public"]["Enums"]["user_role"] };
        Insert: { accepted_at?: string | null; created_at?: string; email: string; full_name?: string | null; invited_by?: string | null; role?: Database["public"]["Enums"]["user_role"] };
        Update: { accepted_at?: string | null; created_at?: string; email?: string; full_name?: string | null; invited_by?: string | null; role?: Database["public"]["Enums"]["user_role"] };
        Relationships: [];
      };
      lead_contacts: {
        Row: { created_at: string; created_by: string | null; from_stage: Database["public"]["Enums"]["lead_stage"] | null; id: number; lead_id: string; summary: string | null; to_stage: Database["public"]["Enums"]["lead_stage"] | null; type: Database["public"]["Enums"]["lead_contact_type"]; workspace_id: string };
        Insert: { created_at?: string; created_by?: string | null; from_stage?: Database["public"]["Enums"]["lead_stage"] | null; id?: never; lead_id: string; summary?: string | null; to_stage?: Database["public"]["Enums"]["lead_stage"] | null; type: Database["public"]["Enums"]["lead_contact_type"]; workspace_id: string };
        Update: { created_at?: string; created_by?: string | null; from_stage?: Database["public"]["Enums"]["lead_stage"] | null; id?: never; lead_id?: string; summary?: string | null; to_stage?: Database["public"]["Enums"]["lead_stage"] | null; type?: Database["public"]["Enums"]["lead_contact_type"]; workspace_id?: string };
        Relationships: [
          { foreignKeyName: "lead_contacts_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "lead_contacts_lead_id_fkey"; columns: ["lead_id"]; isOneToOne: false; referencedRelation: "leads"; referencedColumns: ["id"] },
          { foreignKeyName: "lead_contacts_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] },
        ];
      };
      leads: {
        Row: {
          client_id: string | null; created_at: string; created_by: string | null; email: string | null; full_name: string; id: string; last_contact_at: string | null;
          lost_note: string | null; lost_reason: Database["public"]["Enums"]["lead_lost_reason"] | null; next_contact_note: string | null; next_contact_on: string | null;
          notes: string | null; phone: string; referred_by: string | null; source: Database["public"]["Enums"]["lead_source"]; stage: Database["public"]["Enums"]["lead_stage"];
          stage_changed_at: string; updated_at: string; workspace_id: string;
        };
        Insert: {
          client_id?: string | null; created_at?: string; created_by?: string | null; email?: string | null; full_name: string; id?: string; last_contact_at?: string | null;
          lost_note?: string | null; lost_reason?: Database["public"]["Enums"]["lead_lost_reason"] | null; next_contact_note?: string | null; next_contact_on?: string | null;
          notes?: string | null; phone: string; referred_by?: string | null; source: Database["public"]["Enums"]["lead_source"]; stage?: Database["public"]["Enums"]["lead_stage"];
          stage_changed_at?: string; updated_at?: string; workspace_id: string;
        };
        Update: {
          client_id?: string | null; created_at?: string; created_by?: string | null; email?: string | null; full_name?: string; id?: string; last_contact_at?: string | null;
          lost_note?: string | null; lost_reason?: Database["public"]["Enums"]["lead_lost_reason"] | null; next_contact_note?: string | null; next_contact_on?: string | null;
          notes?: string | null; phone?: string; referred_by?: string | null; source?: Database["public"]["Enums"]["lead_source"]; stage?: Database["public"]["Enums"]["lead_stage"];
          stage_changed_at?: string; updated_at?: string; workspace_id?: string;
        };
        Relationships: [
          { foreignKeyName: "leads_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"] },
          { foreignKeyName: "leads_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "leads_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] },
        ];
      };
      meetings: {
        Row: {
          attendees: string[]; calendar_owner_id: string; client_id: string | null; created_at: string; created_by: string; description: string | null; ends_at: string;
          format: Database["public"]["Enums"]["meeting_format"]; google_event_id: string | null; id: string; lead_id: string | null; location: string | null;
          meet_url: string | null; starts_at: string; status: Database["public"]["Enums"]["meeting_status"]; title: string; type: Database["public"]["Enums"]["meeting_type"];
          updated_at: string; workspace_id: string;
        };
        Insert: {
          attendees?: string[]; calendar_owner_id?: string; client_id?: string | null; created_at?: string; created_by?: string; description?: string | null; ends_at: string;
          format?: Database["public"]["Enums"]["meeting_format"]; google_event_id?: string | null; id?: string; lead_id?: string | null; location?: string | null;
          meet_url?: string | null; starts_at: string; status?: Database["public"]["Enums"]["meeting_status"]; title: string; type?: Database["public"]["Enums"]["meeting_type"];
          updated_at?: string; workspace_id: string;
        };
        Update: {
          attendees?: string[]; calendar_owner_id?: string; client_id?: string | null; created_at?: string; created_by?: string; description?: string | null; ends_at?: string;
          format?: Database["public"]["Enums"]["meeting_format"]; google_event_id?: string | null; id?: string; lead_id?: string | null; location?: string | null;
          meet_url?: string | null; starts_at?: string; status?: Database["public"]["Enums"]["meeting_status"]; title?: string; type?: Database["public"]["Enums"]["meeting_type"];
          updated_at?: string; workspace_id?: string;
        };
        Relationships: [
          { foreignKeyName: "meetings_calendar_owner_id_fkey"; columns: ["calendar_owner_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "meetings_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"] },
          { foreignKeyName: "meetings_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "meetings_lead_id_fkey"; columns: ["lead_id"]; isOneToOne: false; referencedRelation: "leads"; referencedColumns: ["id"] },
          { foreignKeyName: "meetings_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] },
        ];
      };
      process_template_steps: {
        Row: { code: string; id: string; is_final: boolean; position: number; template_id: string; title: string };
        Insert: { code: string; id?: string; is_final?: boolean; position: number; template_id: string; title: string };
        Update: { code?: string; id?: string; is_final?: boolean; position?: number; template_id?: string; title?: string };
        Relationships: [{ foreignKeyName: "process_template_steps_template_id_fkey"; columns: ["template_id"]; isOneToOne: false; referencedRelation: "process_templates"; referencedColumns: ["id"] }];
      };
      process_templates: {
        Row: { code: string; id: string; name: string };
        Insert: { code: string; id?: string; name: string };
        Update: { code?: string; id?: string; name?: string };
        Relationships: [];
      };
      processes: {
        Row: { client_id: string; completed_at: string | null; id: string; started_at: string; status: Database["public"]["Enums"]["process_status"]; template_id: string; workspace_id: string };
        Insert: { client_id: string; completed_at?: string | null; id?: string; started_at?: string; status?: Database["public"]["Enums"]["process_status"]; template_id: string; workspace_id: string };
        Update: { client_id?: string; completed_at?: string | null; id?: string; started_at?: string; status?: Database["public"]["Enums"]["process_status"]; template_id?: string; workspace_id?: string };
        Relationships: [
          { foreignKeyName: "processes_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"] },
          { foreignKeyName: "processes_template_id_fkey"; columns: ["template_id"]; isOneToOne: false; referencedRelation: "process_templates"; referencedColumns: ["id"] },
          { foreignKeyName: "processes_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] },
        ];
      };
      profiles: {
        Row: { active: boolean; created_at: string; email: string; full_name: string; id: string; locale: string; role: Database["public"]["Enums"]["user_role"]; updated_at: string };
        Insert: { active?: boolean; created_at?: string; email: string; full_name?: string; id: string; locale?: string; role?: Database["public"]["Enums"]["user_role"]; updated_at?: string };
        Update: { active?: boolean; created_at?: string; email?: string; full_name?: string; id?: string; locale?: string; role?: Database["public"]["Enums"]["user_role"]; updated_at?: string };
        Relationships: [];
      };
      tasks: {
        Row: {
          assignee_id: string; client_id: string | null; completed_at: string | null; completed_by: string | null; created_at: string; created_by: string;
          description: string | null; due_on: string | null; id: string; lead_id: string | null; not_applicable_reason: string | null;
          origin: Database["public"]["Enums"]["task_origin"]; process_id: string | null; process_step_id: string | null;
          status: Database["public"]["Enums"]["task_status"]; system_key: string | null; title: string; updated_at: string; workspace_id: string;
        };
        Insert: {
          assignee_id: string; client_id?: string | null; completed_at?: string | null; completed_by?: string | null; created_at?: string; created_by?: string;
          description?: string | null; due_on?: string | null; id?: string; lead_id?: string | null; not_applicable_reason?: string | null;
          origin?: Database["public"]["Enums"]["task_origin"]; process_id?: string | null; process_step_id?: string | null;
          status?: Database["public"]["Enums"]["task_status"]; system_key?: string | null; title: string; updated_at?: string; workspace_id: string;
        };
        Update: {
          assignee_id?: string; client_id?: string | null; completed_at?: string | null; completed_by?: string | null; created_at?: string; created_by?: string;
          description?: string | null; due_on?: string | null; id?: string; lead_id?: string | null; not_applicable_reason?: string | null;
          origin?: Database["public"]["Enums"]["task_origin"]; process_id?: string | null; process_step_id?: string | null;
          status?: Database["public"]["Enums"]["task_status"]; system_key?: string | null; title?: string; updated_at?: string; workspace_id?: string;
        };
        Relationships: [
          { foreignKeyName: "tasks_assignee_id_fkey"; columns: ["assignee_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "tasks_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"] },
          { foreignKeyName: "tasks_completed_by_fkey"; columns: ["completed_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "tasks_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "tasks_lead_id_fkey"; columns: ["lead_id"]; isOneToOne: false; referencedRelation: "leads"; referencedColumns: ["id"] },
          { foreignKeyName: "tasks_process_id_fkey"; columns: ["process_id"]; isOneToOne: false; referencedRelation: "processes"; referencedColumns: ["id"] },
          { foreignKeyName: "tasks_process_step_id_fkey"; columns: ["process_step_id"]; isOneToOne: false; referencedRelation: "process_template_steps"; referencedColumns: ["id"] },
          { foreignKeyName: "tasks_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] },
        ];
      };
      workspaces: {
        Row: { created_at: string; id: string; name: string; owner_id: string; updated_at: string };
        Insert: { created_at?: string; id?: string; name: string; owner_id: string; updated_at?: string };
        Update: { created_at?: string; id?: string; name?: string; owner_id?: string; updated_at?: string };
        Relationships: [{ foreignKeyName: "workspaces_owner_id_fkey"; columns: ["owner_id"]; isOneToOne: true; referencedRelation: "profiles"; referencedColumns: ["id"] }];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      client_export_audit: { Args: { p_client: string }; Returns: undefined };
      client_transfer: { Args: { p_client: string; p_workspace: string }; Returns: undefined };
      contribution_execute: { Args: { p_contribution: string; p_date: string; p_institution?: string | null }; Returns: undefined };
      google_connection_delete: { Args: never; Returns: undefined };
      google_connection_for_workspace: {
        Args: { p_workspace_id: string };
        Returns: { google_email: string | null; owner_email: string; owner_id: string; owner_name: string; token_cipher: string | null }[];
      };
      google_connection_save: { Args: { p_google_email: string; p_token_cipher: string }; Returns: undefined };
    };
    Enums: {
      client_event_type:
        | "created" | "migrated" | "converted_from_lead" | "status_changed" | "transferred" | "data_updated" | "note" | "document_uploaded"
        | "document_deleted" | "suitability" | "lgpd_consent" | "task_done" | "meeting_scheduled" | "process_started" | "process_completed" | "family_changed" | "portfolio_snapshot" | "contribution_executed" | "report_approved" | "report_sent" | "profile_set";
      client_status: "onboarding" | "active" | "paused" | "closed";
      asset_class: "cash" | "inflation" | "prefixed" | "multimarket" | "br_equities" | "reits" | "international" | "alternatives" | "pension";
      asset_kind: "listed" | "manual";
      portfolio_frequency: "monthly" | "weekly";
      transaction_type: "buy" | "sell" | "deposit" | "withdrawal";
      contribution_status: "planned" | "executed" | "canceled";
      report_frequency: "monthly" | "quarterly" | "semiannual";
      report_status: "draft" | "approved" | "superseded";
      document_category: "contract" | "id_document" | "proof_of_address" | "lgpd_consent" | "income_proof" | "other" | "broker_profile";
      family_role: "holder" | "spouse" | "dependent";
      investor_profile: "conservative" | "moderate" | "aggressive" | "very_aggressive";
      lead_contact_type: "call" | "whatsapp" | "meeting" | "email" | "note" | "stage_change" | "created" | "meeting_scheduled" | "task_done";
      lead_lost_reason: "price" | "no_fit" | "no_response" | "competitor" | "other";
      lead_source: "instagram" | "active_prospecting" | "referral" | "ai_invest" | "other";
      lead_stage: "new" | "contacted" | "diagnosis" | "proposal" | "won" | "lost";
      marital_status: "single" | "married" | "stable_union" | "divorced" | "widowed";
      meeting_format: "meet" | "in_person";
      meeting_status: "scheduled" | "done" | "canceled";
      meeting_type: "diagnosis" | "onboarding" | "plan_presentation" | "periodic_review" | "follow_up" | "other";
      process_status: "running" | "done" | "canceled";
      task_origin: "manual" | "process" | "meeting" | "system";
      task_status: "open" | "done" | "not_applicable";
      user_role: "admin" | "consultant";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
export type UserRole = Database["public"]["Enums"]["user_role"];
