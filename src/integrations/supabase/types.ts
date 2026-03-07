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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      checklists: {
        Row: {
          category: string
          id: number
          level: number
          task_1: string
          task_2: string
          task_3: string
          task_4: string | null
          tip_1: string
          tip_2: string
          tip_3: string
          tip_4: string | null
        }
        Insert: {
          category: string
          id?: number
          level?: number
          task_1: string
          task_2: string
          task_3: string
          task_4?: string | null
          tip_1: string
          tip_2: string
          tip_3: string
          tip_4?: string | null
        }
        Update: {
          category?: string
          id?: number
          level?: number
          task_1?: string
          task_2?: string
          task_3?: string
          task_4?: string | null
          tip_1?: string
          tip_2?: string
          tip_3?: string
          tip_4?: string | null
        }
        Relationships: []
      }
      clinics: {
        Row: {
          created_at: string
          daily_capacity: number
          doctor_gender: string
          doctor_name: string | null
          has_secretary: boolean
          id: string
          monthly_revenue_target: number | null
          name: string
          num_doctors: number
          payment_type: string
          specialty: string | null
          target_fill_rate: number
          target_noshow_rate: number
          ticket_insurance: number
          ticket_medio: number
          ticket_private: number
          timezone: string
          user_id: string
          working_days: Json
        }
        Insert: {
          created_at?: string
          daily_capacity?: number
          doctor_gender?: string
          doctor_name?: string | null
          has_secretary?: boolean
          id?: string
          monthly_revenue_target?: number | null
          name: string
          num_doctors?: number
          payment_type?: string
          specialty?: string | null
          target_fill_rate?: number
          target_noshow_rate?: number
          ticket_insurance?: number
          ticket_medio?: number
          ticket_private?: number
          timezone?: string
          user_id: string
          working_days?: Json
        }
        Update: {
          created_at?: string
          daily_capacity?: number
          doctor_gender?: string
          doctor_name?: string | null
          has_secretary?: boolean
          id?: string
          monthly_revenue_target?: number | null
          name?: string
          num_doctors?: number
          payment_type?: string
          specialty?: string | null
          target_fill_rate?: number
          target_noshow_rate?: number
          ticket_insurance?: number
          ticket_medio?: number
          ticket_private?: number
          timezone?: string
          user_id?: string
          working_days?: Json
        }
        Relationships: []
      }
      daily_actions: {
        Row: {
          action_type: string
          clinic_id: string
          created_at: string
          date: string
          description: string
          done_at: string | null
          id: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          action_type: string
          clinic_id: string
          created_at?: string
          date: string
          description: string
          done_at?: string | null
          id?: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          action_type?: string
          clinic_id?: string
          created_at?: string
          date?: string
          description?: string
          done_at?: string | null
          id?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_actions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_checkins: {
        Row: {
          appointments_done: number
          appointments_scheduled: number
          attended_insurance: number
          attended_private: number
          cancellations: number
          clinic_id: string
          created_at: string
          date: string
          empty_slots: number
          followup_done: boolean
          id: string
          insight_text: string | null
          new_appointments: number
          no_show: number
          noshows_insurance: number
          noshows_private: number
          notes: string | null
          user_id: string
        }
        Insert: {
          appointments_done?: number
          appointments_scheduled?: number
          attended_insurance?: number
          attended_private?: number
          cancellations?: number
          clinic_id: string
          created_at?: string
          date: string
          empty_slots?: number
          followup_done?: boolean
          id?: string
          insight_text?: string | null
          new_appointments?: number
          no_show?: number
          noshows_insurance?: number
          noshows_private?: number
          notes?: string | null
          user_id: string
        }
        Update: {
          appointments_done?: number
          appointments_scheduled?: number
          attended_insurance?: number
          attended_private?: number
          cancellations?: number
          clinic_id?: string
          created_at?: string
          date?: string
          empty_slots?: number
          followup_done?: boolean
          id?: string
          insight_text?: string | null
          new_appointments?: number
          no_show?: number
          noshows_insurance?: number
          noshows_private?: number
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_checkins_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_checklist_answers: {
        Row: {
          answers: Json
          clinic_id: string
          completed: boolean
          created_at: string
          date: string
          day_of_week: number
          id: string
          points_earned: number
          user_id: string
        }
        Insert: {
          answers?: Json
          clinic_id: string
          completed?: boolean
          created_at?: string
          date: string
          day_of_week: number
          id?: string
          points_earned?: number
          user_id: string
        }
        Update: {
          answers?: Json
          clinic_id?: string
          completed?: boolean
          created_at?: string
          date?: string
          day_of_week?: number
          id?: string
          points_earned?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_checklist_answers_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_verses: {
        Row: {
          day_of_year: number
          id: number
          verse_reference: string
          verse_text: string
        }
        Insert: {
          day_of_year: number
          id?: never
          verse_reference: string
          verse_text: string
        }
        Update: {
          day_of_year?: number
          id?: never
          verse_reference?: string
          verse_text?: string
        }
        Relationships: []
      }
      loss_reasons: {
        Row: {
          clinic_id: string
          count: number
          created_at: string
          date: string
          id: string
          reason: string
          type: string
          user_id: string
        }
        Insert: {
          clinic_id: string
          count?: number
          created_at?: string
          date: string
          id?: string
          reason: string
          type: string
          user_id: string
        }
        Update: {
          clinic_id?: string
          count?: number
          created_at?: string
          date?: string
          id?: string
          reason?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loss_reasons_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_news: {
        Row: {
          category: string
          created_at: string
          external_url: string
          id: string
          image_url: string | null
          is_active: boolean
          published_at: string
          source: string
          summary: string
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          external_url: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          published_at?: string
          source: string
          summary: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          external_url?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          published_at?: string
          source?: string
          summary?: string
          title?: string
        }
        Relationships: []
      }
      monthly_reports: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          month_date: string
          report_text: string
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          month_date: string
          report_text: string
          user_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          month_date?: string
          report_text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_reports_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          active: boolean
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          published_at: string
          summary: string
          title: string
        }
        Insert: {
          active?: boolean
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          published_at?: string
          summary: string
          title: string
        }
        Update: {
          active?: boolean
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          published_at?: string
          summary?: string
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          checklist_level: number
          created_at: string
          current_period_end: string | null
          email: string | null
          has_efficiency_badge: boolean
          onboarding_completed: boolean
          stripe_customer_id: string | null
          subscription_status: string
          user_id: string
        }
        Insert: {
          checklist_level?: number
          created_at?: string
          current_period_end?: string | null
          email?: string | null
          has_efficiency_badge?: boolean
          onboarding_completed?: boolean
          stripe_customer_id?: string | null
          subscription_status?: string
          user_id: string
        }
        Update: {
          checklist_level?: number
          created_at?: string
          current_period_end?: string | null
          email?: string | null
          has_efficiency_badge?: boolean
          onboarding_completed?: boolean
          stripe_customer_id?: string | null
          subscription_status?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_reports: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          report_text: string
          user_id: string
          week_start_date: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          report_text: string
          user_id: string
          week_start_date: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          report_text?: string
          user_id?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_reports_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_daily_verse: {
        Args: { target_date?: string }
        Returns: {
          day_of_year: number
          verse_reference: string
          verse_text: string
        }[]
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
    Enums: {},
  },
} as const
