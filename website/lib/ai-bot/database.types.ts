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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_call_campaigns: {
        Row: {
          created_at: string
          description: string | null
          employee_id: string | null
          ends_at: string | null
          id: string
          max_attempts: number
          min_score: number
          name: string
          starts_at: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          employee_id?: string | null
          ends_at?: string | null
          id?: string
          max_attempts?: number
          min_score?: number
          name: string
          starts_at?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          employee_id?: string | null
          ends_at?: string | null
          id?: string
          max_attempts?: number
          min_score?: number
          name?: string
          starts_at?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_call_campaigns_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "ai_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_call_campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "ai_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_call_events: {
        Row: {
          call_session_id: string
          event_type: string
          id: string
          occurred_at: string
          payload: Json
          status: string | null
        }
        Insert: {
          call_session_id: string
          event_type: string
          id?: string
          occurred_at?: string
          payload?: Json
          status?: string | null
        }
        Update: {
          call_session_id?: string
          event_type?: string
          id?: string
          occurred_at?: string
          payload?: Json
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_call_events_call_session_id_fkey"
            columns: ["call_session_id"]
            isOneToOne: false
            referencedRelation: "ai_call_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_call_sessions: {
        Row: {
          campaign_id: string | null
          created_at: string
          direction: string
          duration_seconds: number | null
          employee_id: string | null
          ended_at: string | null
          from_number: string | null
          id: string
          lead_id: string
          outcome: string | null
          provider: string | null
          provider_call_id: string | null
          recording_url: string | null
          score: number | null
          started_at: string | null
          status: string
          summary: string | null
          to_number: string | null
          transcript_url: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          employee_id?: string | null
          ended_at?: string | null
          from_number?: string | null
          id?: string
          lead_id: string
          outcome?: string | null
          provider?: string | null
          provider_call_id?: string | null
          recording_url?: string | null
          score?: number | null
          started_at?: string | null
          status?: string
          summary?: string | null
          to_number?: string | null
          transcript_url?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          employee_id?: string | null
          ended_at?: string | null
          from_number?: string | null
          id?: string
          lead_id?: string
          outcome?: string | null
          provider?: string | null
          provider_call_id?: string | null
          recording_url?: string | null
          score?: number | null
          started_at?: string | null
          status?: string
          summary?: string | null
          to_number?: string | null
          transcript_url?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_call_sessions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ai_call_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_call_sessions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "ai_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_call_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "ai_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_call_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "ai_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_call_transcripts: {
        Row: {
          call_session_id: string
          confidence: number | null
          created_at: string
          id: string
          language: string | null
          sequence: number
          speaker: string
          text: string
        }
        Insert: {
          call_session_id: string
          confidence?: number | null
          created_at?: string
          id?: string
          language?: string | null
          sequence: number
          speaker: string
          text: string
        }
        Update: {
          call_session_id?: string
          confidence?: number | null
          created_at?: string
          id?: string
          language?: string | null
          sequence?: number
          speaker?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_call_transcripts_call_session_id_fkey"
            columns: ["call_session_id"]
            isOneToOne: false
            referencedRelation: "ai_call_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_campaign_leads: {
        Row: {
          attempts: number
          campaign_id: string
          created_at: string
          last_attempt_at: string | null
          lead_id: string
          next_attempt_at: string | null
          state: string
        }
        Insert: {
          attempts?: number
          campaign_id: string
          created_at?: string
          last_attempt_at?: string | null
          lead_id: string
          next_attempt_at?: string | null
          state?: string
        }
        Update: {
          attempts?: number
          campaign_id?: string
          created_at?: string
          last_attempt_at?: string | null
          lead_id?: string
          next_attempt_at?: string | null
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_campaign_leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ai_call_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_campaign_leads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "ai_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_employees: {
        Row: {
          active: boolean
          created_at: string
          id: string
          languages: string[]
          name: string
          role: string
          slug: string
          system_prompt: string
          updated_at: string
          voice_id: string | null
          voice_provider: string | null
          workspace_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          languages?: string[]
          name: string
          role: string
          slug: string
          system_prompt?: string
          updated_at?: string
          voice_id?: string | null
          voice_provider?: string | null
          workspace_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          languages?: string[]
          name?: string
          role?: string
          slug?: string
          system_prompt?: string
          updated_at?: string
          voice_id?: string | null
          voice_provider?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_employees_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "ai_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_followups: {
        Row: {
          assigned_to: string | null
          call_session_id: string | null
          created_at: string
          id: string
          lead_id: string
          notes: string | null
          scheduled_for: string
          status: string
          type: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          call_session_id?: string | null
          created_at?: string
          id?: string
          lead_id: string
          notes?: string | null
          scheduled_for: string
          status?: string
          type?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          call_session_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          notes?: string | null
          scheduled_for?: string
          status?: string
          type?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_followups_call_session_id_fkey"
            columns: ["call_session_id"]
            isOneToOne: false
            referencedRelation: "ai_call_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_followups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "ai_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_followups_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "ai_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_knowledge_documents: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          metadata: Json
          status: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          metadata?: Json
          status?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_knowledge_documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "ai_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_lead_scores: {
        Row: {
          call_session_id: string | null
          created_at: string
          id: string
          lead_id: string
          reasons: Json
          score: number
          status: string
          workspace_id: string
        }
        Insert: {
          call_session_id?: string | null
          created_at?: string
          id?: string
          lead_id: string
          reasons?: Json
          score: number
          status: string
          workspace_id: string
        }
        Update: {
          call_session_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          reasons?: Json
          score?: number
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_lead_scores_call_session_id_fkey"
            columns: ["call_session_id"]
            isOneToOne: false
            referencedRelation: "ai_call_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_lead_scores_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "ai_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_lead_scores_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "ai_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_leads: {
        Row: {
          assigned_to: string | null
          budget: number | null
          created_at: string
          destination: string | null
          email: string | null
          external_id: string | null
          id: string
          intent: string
          language: string | null
          last_contact_at: string | null
          name: string
          phone: string
          score: number
          source: string | null
          status: string
          travel_date: string | null
          travellers: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          budget?: number | null
          created_at?: string
          destination?: string | null
          email?: string | null
          external_id?: string | null
          id?: string
          intent?: string
          language?: string | null
          last_contact_at?: string | null
          name: string
          phone: string
          score?: number
          source?: string | null
          status?: string
          travel_date?: string | null
          travellers?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          budget?: number | null
          created_at?: string
          destination?: string | null
          email?: string | null
          external_id?: string | null
          id?: string
          intent?: string
          language?: string | null
          last_contact_at?: string | null
          name?: string
          phone?: string
          score?: number
          source?: string | null
          status?: string
          travel_date?: string | null
          travellers?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "ai_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_settings: {
        Row: {
          ai_model: string | null
          ai_provider: string | null
          config: Json
          crm_enabled: boolean
          recording_enabled: boolean
          updated_at: string
          voice_from_number: string | null
          voice_provider: string | null
          whatsapp_enabled: boolean
          workspace_id: string
        }
        Insert: {
          ai_model?: string | null
          ai_provider?: string | null
          config?: Json
          crm_enabled?: boolean
          recording_enabled?: boolean
          updated_at?: string
          voice_from_number?: string | null
          voice_provider?: string | null
          whatsapp_enabled?: boolean
          workspace_id: string
        }
        Update: {
          ai_model?: string | null
          ai_provider?: string | null
          config?: Json
          crm_enabled?: boolean
          recording_enabled?: boolean
          updated_at?: string
          voice_from_number?: string | null
          voice_provider?: string | null
          whatsapp_enabled?: boolean
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "ai_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_workspace_members: {
        Row: {
          created_at: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "ai_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ai_workspace_member: {
        Args: { target_workspace: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
