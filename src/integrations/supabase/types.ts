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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      action_executions: {
        Row: {
          action_id: string
          executed_at: string
          executed_by: string | null
          id: string
          incident_id: string
          note: string | null
          organization_id: string
          outcome: string
        }
        Insert: {
          action_id: string
          executed_at?: string
          executed_by?: string | null
          id?: string
          incident_id: string
          note?: string | null
          organization_id: string
          outcome: string
        }
        Update: {
          action_id?: string
          executed_at?: string
          executed_by?: string | null
          id?: string
          incident_id?: string
          note?: string | null
          organization_id?: string
          outcome?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_executions_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "recommended_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_executions_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_executions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_runs: {
        Row: {
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          incident_id: string | null
          latency_ms: number | null
          mode: string
          model: string | null
          organization_id: string
          prompt_summary: string | null
          run_type: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          incident_id?: string | null
          latency_ms?: number | null
          mode?: string
          model?: string | null
          organization_id: string
          prompt_summary?: string | null
          run_type: string
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          incident_id?: string | null
          latency_ms?: number | null
          mode?: string
          model?: string | null
          organization_id?: string
          prompt_summary?: string | null
          run_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_runs_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_triage_results: {
        Row: {
          ai_run_id: string | null
          category: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision: string
          decision_note: string | null
          evidence_confidence: number
          id: string
          incident_id: string
          missing_information: string[]
          organization_id: string
          suggested_severity:
            | Database["public"]["Enums"]["severity_level"]
            | null
          suggested_system_id: string | null
          summary: string | null
        }
        Insert: {
          ai_run_id?: string | null
          category?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: string
          decision_note?: string | null
          evidence_confidence?: number
          id?: string
          incident_id: string
          missing_information?: string[]
          organization_id: string
          suggested_severity?:
            | Database["public"]["Enums"]["severity_level"]
            | null
          suggested_system_id?: string | null
          summary?: string | null
        }
        Update: {
          ai_run_id?: string | null
          category?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: string
          decision_note?: string | null
          evidence_confidence?: number
          id?: string
          incident_id?: string
          missing_information?: string[]
          organization_id?: string
          suggested_severity?:
            | Database["public"]["Enums"]["severity_level"]
            | null
          suggested_system_id?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_triage_results_ai_run_id_fkey"
            columns: ["ai_run_id"]
            isOneToOne: false
            referencedRelation: "ai_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_triage_results_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_triage_results_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_triage_results_suggested_system_id_fkey"
            columns: ["suggested_system_id"]
            isOneToOne: false
            referencedRelation: "financial_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_kind: string
          after_summary: Json | null
          before_summary: Json | null
          correlation_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          organization_id: string | null
          reason: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_kind?: string
          after_summary?: Json | null
          before_summary?: Json | null
          correlation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          organization_id?: string | null
          reason?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_kind?: string
          after_summary?: Json | null
          before_summary?: Json | null
          correlation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          organization_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_cases: {
        Row: {
          active: boolean
          case_key: string
          created_at: string
          evidence_required: boolean
          expected_category: string
          expected_severity: Database["public"]["Enums"]["severity_level"]
          id: string
          input_text: string
          organization_id: string
        }
        Insert: {
          active?: boolean
          case_key: string
          created_at?: string
          evidence_required?: boolean
          expected_category: string
          expected_severity: Database["public"]["Enums"]["severity_level"]
          id?: string
          input_text: string
          organization_id: string
        }
        Update: {
          active?: boolean
          case_key?: string
          created_at?: string
          evidence_required?: boolean
          expected_category?: string
          expected_severity?: Database["public"]["Enums"]["severity_level"]
          id?: string
          input_text?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_runs: {
        Row: {
          category_accuracy: number
          created_at: string
          created_by: string | null
          id: string
          mode: string
          no_answer_accuracy: number
          organization_id: string
          passed_cases: number
          severity_accuracy: number
          suite_version: string
          total_cases: number
        }
        Insert: {
          category_accuracy: number
          created_at?: string
          created_by?: string | null
          id?: string
          mode?: string
          no_answer_accuracy: number
          organization_id: string
          passed_cases: number
          severity_accuracy: number
          suite_version: string
          total_cases: number
        }
        Update: {
          category_accuracy?: number
          created_at?: string
          created_by?: string | null
          id?: string
          mode?: string
          no_answer_accuracy?: number
          organization_id?: string
          passed_cases?: number
          severity_accuracy?: number
          suite_version?: string
          total_cases?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_systems: {
        Row: {
          code: string
          created_at: string
          criticality: Database["public"]["Enums"]["severity_level"]
          domain: string
          environment: string
          id: string
          name: string
          organization_id: string
          owner_team: string | null
        }
        Insert: {
          code: string
          created_at?: string
          criticality?: Database["public"]["Enums"]["severity_level"]
          domain: string
          environment?: string
          id?: string
          name: string
          organization_id: string
          owner_team?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          criticality?: Database["public"]["Enums"]["severity_level"]
          domain?: string
          environment?: string
          id?: string
          name?: string
          organization_id?: string
          owner_team?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_systems_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_comments: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          incident_id: string
          organization_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          incident_id: string
          organization_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          incident_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_comments_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_events: {
        Row: {
          actor_id: string | null
          actor_kind: string
          created_at: string
          detail: Json
          event_type: string
          id: string
          incident_id: string
          organization_id: string
          summary: string
        }
        Insert: {
          actor_id?: string | null
          actor_kind?: string
          created_at?: string
          detail?: Json
          event_type: string
          id?: string
          incident_id: string
          organization_id: string
          summary: string
        }
        Update: {
          actor_id?: string | null
          actor_kind?: string
          created_at?: string
          detail?: Json
          event_type?: string
          id?: string
          incident_id?: string
          organization_id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_events_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_knowledge_links: {
        Row: {
          article_id: string
          created_at: string
          id: string
          incident_id: string
          link_type: string
          organization_id: string
          score: number | null
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          incident_id: string
          link_type?: string
          organization_id: string
          score?: number | null
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          incident_id?: string
          link_type?: string
          organization_id?: string
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_knowledge_links_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "knowledge_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_knowledge_links_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_knowledge_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          acknowledged_at: string | null
          ai_suggested_severity:
            | Database["public"]["Enums"]["severity_level"]
            | null
          approved_severity:
            | Database["public"]["Enums"]["severity_level"]
            | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string
          detected_at: string
          environment: string
          id: string
          knowledge_promoted: boolean
          organization_id: string
          owner_id: string | null
          reference: string
          reported_severity:
            | Database["public"]["Enums"]["severity_level"]
            | null
          resolution_summary: string | null
          resolved_at: string | null
          severity_decided_by: string | null
          severity_decision_reason: string | null
          status: Database["public"]["Enums"]["incident_status"]
          system_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          ai_suggested_severity?:
            | Database["public"]["Enums"]["severity_level"]
            | null
          approved_severity?:
            | Database["public"]["Enums"]["severity_level"]
            | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          detected_at?: string
          environment?: string
          id?: string
          knowledge_promoted?: boolean
          organization_id: string
          owner_id?: string | null
          reference: string
          reported_severity?:
            | Database["public"]["Enums"]["severity_level"]
            | null
          resolution_summary?: string | null
          resolved_at?: string | null
          severity_decided_by?: string | null
          severity_decision_reason?: string | null
          status?: Database["public"]["Enums"]["incident_status"]
          system_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          ai_suggested_severity?:
            | Database["public"]["Enums"]["severity_level"]
            | null
          approved_severity?:
            | Database["public"]["Enums"]["severity_level"]
            | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          detected_at?: string
          environment?: string
          id?: string
          knowledge_promoted?: boolean
          organization_id?: string
          owner_id?: string | null
          reference?: string
          reported_severity?:
            | Database["public"]["Enums"]["severity_level"]
            | null
          resolution_summary?: string | null
          resolved_at?: string | null
          severity_decided_by?: string | null
          severity_decision_reason?: string | null
          status?: Database["public"]["Enums"]["incident_status"]
          system_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "financial_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_jobs: {
        Row: {
          created_at: string
          created_by: string | null
          file_name: string
          id: string
          mime_type: string
          organization_id: string
          redaction_status: string
          rejection_reason: string | null
          sha256: string | null
          size_bytes: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_name: string
          id?: string
          mime_type: string
          organization_id: string
          redaction_status?: string
          rejection_reason?: string | null
          sha256?: string | null
          size_bytes: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_name?: string
          id?: string
          mime_type?: string
          organization_id?: string
          redaction_status?: string
          rejection_reason?: string | null
          sha256?: string | null
          size_bytes?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_articles: {
        Row: {
          body: string
          confidentiality: string
          created_at: string
          created_by: string | null
          environment: string | null
          financial_domain: string | null
          freshness: Database["public"]["Enums"]["freshness_status"]
          id: string
          incident_type: string | null
          last_reviewed_at: string | null
          organization_id: string
          redaction_status: string
          region: string | null
          reuse_count: number
          severity: Database["public"]["Enums"]["severity_level"] | null
          source_incident_id: string | null
          source_type: string
          status: Database["public"]["Enums"]["knowledge_status"]
          success_count: number
          summary: string
          system_id: string | null
          tags: string[]
          title: string
          updated_at: string
          verified: boolean
          verified_by: string | null
          version_range: string | null
          visibility: Database["public"]["Enums"]["knowledge_visibility"]
        }
        Insert: {
          body: string
          confidentiality?: string
          created_at?: string
          created_by?: string | null
          environment?: string | null
          financial_domain?: string | null
          freshness?: Database["public"]["Enums"]["freshness_status"]
          id?: string
          incident_type?: string | null
          last_reviewed_at?: string | null
          organization_id: string
          redaction_status?: string
          region?: string | null
          reuse_count?: number
          severity?: Database["public"]["Enums"]["severity_level"] | null
          source_incident_id?: string | null
          source_type?: string
          status?: Database["public"]["Enums"]["knowledge_status"]
          success_count?: number
          summary: string
          system_id?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          verified?: boolean
          verified_by?: string | null
          version_range?: string | null
          visibility?: Database["public"]["Enums"]["knowledge_visibility"]
        }
        Update: {
          body?: string
          confidentiality?: string
          created_at?: string
          created_by?: string | null
          environment?: string | null
          financial_domain?: string | null
          freshness?: Database["public"]["Enums"]["freshness_status"]
          id?: string
          incident_type?: string | null
          last_reviewed_at?: string | null
          organization_id?: string
          redaction_status?: string
          region?: string | null
          reuse_count?: number
          severity?: Database["public"]["Enums"]["severity_level"] | null
          source_incident_id?: string | null
          source_type?: string
          status?: Database["public"]["Enums"]["knowledge_status"]
          success_count?: number
          summary?: string
          system_id?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          verified?: boolean
          verified_by?: string | null
          version_range?: string | null
          visibility?: Database["public"]["Enums"]["knowledge_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_articles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_articles_source_incident_id_fkey"
            columns: ["source_incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_articles_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "financial_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_chunks: {
        Row: {
          article_id: string
          chunk_index: number
          content: string
          created_at: string
          id: string
          organization_id: string
          search_vector: unknown
        }
        Insert: {
          article_id: string
          chunk_index?: number
          content: string
          created_at?: string
          id?: string
          organization_id: string
          search_vector?: unknown
        }
        Update: {
          article_id?: string
          chunk_index?: number
          content?: string
          created_at?: string
          id?: string
          organization_id?: string
          search_vector?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "knowledge_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_chunks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          is_demo: boolean
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_demo?: boolean
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          is_demo?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      postmortems: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          id: string
          impact: string | null
          incident_id: string
          lessons: string | null
          organization_id: string
          preventive_actions: string | null
          root_cause: string | null
          status: string
          timeline: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          impact?: string | null
          incident_id: string
          lessons?: string | null
          organization_id: string
          preventive_actions?: string | null
          root_cause?: string | null
          status?: string
          timeline?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          impact?: string | null
          incident_id?: string
          lessons?: string | null
          organization_id?: string
          preventive_actions?: string | null
          root_cause?: string | null
          status?: string
          timeline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "postmortems_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: true
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postmortems_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      problems: {
        Row: {
          created_at: string
          id: string
          occurrence_count: number
          organization_id: string
          pattern_summary: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          occurrence_count?: number
          organization_id: string
          pattern_summary: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          occurrence_count?: number
          organization_id?: string
          pattern_summary?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "problems_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          title: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          title?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          title?: string | null
        }
        Relationships: []
      }
      recommended_actions: {
        Row: {
          ai_run_id: string | null
          confidence: number
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision: string
          decision_note: string | null
          detail: string | null
          evidence: Json
          id: string
          incident_id: string
          organization_id: string
          risk_level: string
          title: string
        }
        Insert: {
          ai_run_id?: string | null
          confidence?: number
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: string
          decision_note?: string | null
          detail?: string | null
          evidence?: Json
          id?: string
          incident_id: string
          organization_id: string
          risk_level?: string
          title: string
        }
        Update: {
          ai_run_id?: string | null
          confidence?: number
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: string
          decision_note?: string | null
          detail?: string | null
          evidence?: Json
          id?: string
          incident_id?: string
          organization_id?: string
          risk_level?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommended_actions_ai_run_id_fkey"
            columns: ["ai_run_id"]
            isOneToOne: false
            referencedRelation: "ai_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommended_actions_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommended_actions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      retrieval_runs: {
        Row: {
          created_at: string
          id: string
          incident_id: string | null
          organization_id: string
          query: string
          result_count: number
          strategy: string
          top_score: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          incident_id?: string | null
          organization_id: string
          query: string
          result_count?: number
          strategy?: string
          top_score?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          incident_id?: string | null
          organization_id?: string
          query?: string
          result_count?: number
          strategy?: string
          top_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "retrieval_runs_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retrieval_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      root_cause_hypotheses: {
        Row: {
          ai_run_id: string | null
          confidence: number
          created_at: string
          evidence: Json
          hypothesis: string
          id: string
          incident_id: string
          organization_id: string
          rationale: string | null
          status: string
        }
        Insert: {
          ai_run_id?: string | null
          confidence?: number
          created_at?: string
          evidence?: Json
          hypothesis: string
          id?: string
          incident_id: string
          organization_id: string
          rationale?: string | null
          status?: string
        }
        Update: {
          ai_run_id?: string | null
          confidence?: number
          created_at?: string
          evidence?: Json
          hypothesis?: string
          id?: string
          incident_id?: string
          organization_id?: string
          rationale?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "root_cause_hypotheses_ai_run_id_fkey"
            columns: ["ai_run_id"]
            isOneToOne: false
            referencedRelation: "ai_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "root_cause_hypotheses_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "root_cause_hypotheses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          event_type: string
          id: string
          idempotency_key: string
          incident_id: string | null
          organization_id: string
          payload_digest: string
          received_at: string
          source: string
          status: string
        }
        Insert: {
          event_type: string
          id?: string
          idempotency_key: string
          incident_id?: string | null
          organization_id: string
          payload_digest: string
          received_at?: string
          source: string
          status?: string
        }
        Update: {
          event_type?: string
          id?: string
          idempotency_key?: string
          incident_id?: string | null
          organization_id?: string
          payload_digest?: string
          received_at?: string
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_org_role: {
        Args: { _org: string; _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      is_org_member: { Args: { _org: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role:
        | "reporter"
        | "responder"
        | "manager"
        | "curator"
        | "tenant_admin"
        | "platform_admin"
      freshness_status: "valid" | "needs_review" | "stale" | "deprecated"
      incident_status:
        | "new"
        | "triage_pending"
        | "triaged"
        | "investigating"
        | "mitigated"
        | "resolved"
        | "knowledge_review"
        | "closed"
        | "reopened"
      knowledge_status:
        | "draft"
        | "under_review"
        | "approved_private"
        | "proposed_shared"
        | "approved_shared"
        | "needs_review"
        | "stale"
        | "deprecated"
        | "rejected"
      knowledge_visibility: "private" | "shared"
      severity_level: "P1" | "P2" | "P3" | "P4"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: [
        "reporter",
        "responder",
        "manager",
        "curator",
        "tenant_admin",
        "platform_admin",
      ],
      freshness_status: ["valid", "needs_review", "stale", "deprecated"],
      incident_status: [
        "new",
        "triage_pending",
        "triaged",
        "investigating",
        "mitigated",
        "resolved",
        "knowledge_review",
        "closed",
        "reopened",
      ],
      knowledge_status: [
        "draft",
        "under_review",
        "approved_private",
        "proposed_shared",
        "approved_shared",
        "needs_review",
        "stale",
        "deprecated",
        "rejected",
      ],
      knowledge_visibility: ["private", "shared"],
      severity_level: ["P1", "P2", "P3", "P4"],
    },
  },
} as const
