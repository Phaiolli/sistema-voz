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
      event_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          event_data: Json | null
          event_id: string | null
          id: string
          owner_id: string
          paid_at: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          event_data?: Json | null
          event_id?: string | null
          id: string
          owner_id: string
          paid_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          event_data?: Json | null
          event_id?: string | null
          id?: string
          owner_id?: string
          paid_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_payments_event_id_events_id_fk"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_payments_owner_id_users_id_fk"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          about: string
          address: string
          config: Json
          created_at: string
          ends_at: string
          id: string
          is_paid: boolean
          name: string
          organizer_id: string
          place: string
          slug: string
          starts_at: string
          status: Database["public"]["Enums"]["event_status"]
          theme: Json
          updated_at: string
        }
        Insert: {
          about?: string
          address: string
          config?: Json
          created_at?: string
          ends_at: string
          id: string
          is_paid?: boolean
          name: string
          organizer_id: string
          place: string
          slug: string
          starts_at: string
          status?: Database["public"]["Enums"]["event_status"]
          theme?: Json
          updated_at?: string
        }
        Update: {
          about?: string
          address?: string
          config?: Json
          created_at?: string
          ends_at?: string
          id?: string
          is_paid?: boolean
          name?: string
          organizer_id?: string
          place?: string
          slug?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          theme?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_organizer_id_users_id_fk"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mediator_assignments: {
        Row: {
          created_at: string
          event_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mediator_assignments_event_id_events_id_fk"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mediator_assignments_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          contact: string
          created_at: string
          event_id: string
          id: string
          lgpd_accepted: boolean
          name: string
          questions_count: number
        }
        Insert: {
          contact: string
          created_at?: string
          event_id: string
          id: string
          lgpd_accepted?: boolean
          name: string
          questions_count?: number
        }
        Update: {
          contact?: string
          created_at?: string
          event_id?: string
          id?: string
          lgpd_accepted?: boolean
          name?: string
          questions_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "participants_event_id_events_id_fk"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          answered_at: string | null
          author_contact: string | null
          author_email: string | null
          author_ip: string | null
          author_name: string
          created_at: string
          event_id: string
          hidden_at: string | null
          hidden_by: string | null
          id: string
          is_anonymous: boolean
          lgpd_accepted: boolean
          presented_at: string | null
          status: Database["public"]["Enums"]["question_status"]
          text: string
        }
        Insert: {
          answered_at?: string | null
          author_contact?: string | null
          author_email?: string | null
          author_ip?: string | null
          author_name: string
          created_at?: string
          event_id: string
          hidden_at?: string | null
          hidden_by?: string | null
          id: string
          is_anonymous?: boolean
          lgpd_accepted?: boolean
          presented_at?: string | null
          status?: Database["public"]["Enums"]["question_status"]
          text: string
        }
        Update: {
          answered_at?: string | null
          author_contact?: string | null
          author_email?: string | null
          author_ip?: string | null
          author_name?: string
          created_at?: string
          event_id?: string
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          is_anonymous?: boolean
          lgpd_accepted?: boolean
          presented_at?: string | null
          status?: Database["public"]["Enums"]["question_status"]
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_event_id_events_id_fk"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          author_ip: string | null
          checked_in: boolean
          checked_in_at: string | null
          created_at: string
          document: string | null
          drawn: boolean
          drawn_at: string | null
          email: string
          event_id: string
          id: string
          kit_delivered: boolean
          kit_delivered_at: string | null
          lgpd_accepted: boolean
          name: string
          phone: string | null
        }
        Insert: {
          author_ip?: string | null
          checked_in?: boolean
          checked_in_at?: string | null
          created_at?: string
          document?: string | null
          drawn?: boolean
          drawn_at?: string | null
          email: string
          event_id: string
          id: string
          kit_delivered?: boolean
          kit_delivered_at?: string | null
          lgpd_accepted?: boolean
          name: string
          phone?: string | null
        }
        Update: {
          author_ip?: string | null
          checked_in?: boolean
          checked_in_at?: string | null
          created_at?: string
          document?: string | null
          drawn?: boolean
          drawn_at?: string | null
          email?: string
          event_id?: string
          id?: string
          kit_delivered?: boolean
          kit_delivered_at?: string | null
          lgpd_accepted?: boolean
          name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_event_id_events_id_fk"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          clerk_id: string | null
          created_at: string
          current_period_end: string | null
          email: string
          id: string
          last_seen_at: string | null
          name: string
          password_hash: string | null
          plan: Database["public"]["Enums"]["user_plan"]
          role: Database["public"]["Enums"]["user_role"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
        }
        Insert: {
          clerk_id?: string | null
          created_at?: string
          current_period_end?: string | null
          email: string
          id: string
          last_seen_at?: string | null
          name: string
          password_hash?: string | null
          plan?: Database["public"]["Enums"]["user_plan"]
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
        }
        Update: {
          clerk_id?: string | null
          created_at?: string
          current_period_end?: string | null
          email?: string
          id?: string
          last_seen_at?: string | null
          name?: string
          password_hash?: string | null
          plan?: Database["public"]["Enums"]["user_plan"]
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      event_status: "draft" | "active" | "ended"
      question_status: "pending" | "next" | "answered" | "hidden"
      user_plan: "free" | "paid"
      user_role: "admin" | "mediador" | "owner" | "superadmin"
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
      event_status: ["draft", "active", "ended"],
      question_status: ["pending", "next", "answered", "hidden"],
      user_plan: ["free", "paid"],
      user_role: ["admin", "mediador", "owner", "superadmin"],
    },
  },
} as const
