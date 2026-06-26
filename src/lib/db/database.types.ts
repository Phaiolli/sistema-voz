/**
 * Hand-written Supabase `Database` type for `createClient<Database>()`.
 *
 * Derived from the Drizzle schema in `./schema.ts` (the source of truth for the
 * real, snake_case columns). Kept in sync manually because `supabase gen types`
 * is not available in CI (no network/credentials). When a column changes in
 * `schema.ts`, update the matching `Row`/`Insert`/`Update` here.
 *
 * Conventions:
 * - `timestamp` columns are serialised as ISO strings by supabase-js.
 * - `jsonb` columns are typed as the domain shape when known, else `unknown`.
 * - `Insert` makes columns with DB defaults / nullable optional.
 */
import type { EventTheme, EventConfig } from "@/lib/types";

type EventStatus = "draft" | "active" | "ended";
type QuestionStatus = "pending" | "next" | "answered" | "hidden";
type UserRole = "admin" | "mediador" | "owner" | "superadmin";

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          slug: string;
          name: string;
          starts_at: string;
          ends_at: string;
          place: string;
          address: string;
          status: EventStatus;
          about: string;
          theme: EventTheme;
          config: EventConfig;
          organizer_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          slug: string;
          name: string;
          starts_at: string;
          ends_at: string;
          place: string;
          address: string;
          status?: EventStatus;
          about?: string;
          theme?: EventTheme;
          config?: EventConfig;
          organizer_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          starts_at?: string;
          ends_at?: string;
          place?: string;
          address?: string;
          status?: EventStatus;
          about?: string;
          theme?: EventTheme;
          config?: EventConfig;
          organizer_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          id: string;
          event_id: string;
          author_name: string;
          author_contact: string | null;
          author_email: string | null;
          author_ip: string | null;
          text: string;
          status: QuestionStatus;
          is_anonymous: boolean;
          lgpd_accepted: boolean;
          created_at: string;
          presented_at: string | null;
          answered_at: string | null;
          hidden_at: string | null;
          hidden_by: string | null;
        };
        Insert: {
          id: string;
          event_id: string;
          author_name: string;
          author_contact?: string | null;
          author_email?: string | null;
          author_ip?: string | null;
          text: string;
          status?: QuestionStatus;
          is_anonymous?: boolean;
          lgpd_accepted?: boolean;
          created_at?: string;
          presented_at?: string | null;
          answered_at?: string | null;
          hidden_at?: string | null;
          hidden_by?: string | null;
        };
        Update: {
          id?: string;
          event_id?: string;
          author_name?: string;
          author_contact?: string | null;
          author_email?: string | null;
          author_ip?: string | null;
          text?: string;
          status?: QuestionStatus;
          is_anonymous?: boolean;
          lgpd_accepted?: boolean;
          created_at?: string;
          presented_at?: string | null;
          answered_at?: string | null;
          hidden_at?: string | null;
          hidden_by?: string | null;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: UserRole;
          plan: string;
          password_hash: string;
          created_at: string;
          last_seen_at: string | null;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          role?: UserRole;
          plan?: string;
          password_hash: string;
          created_at?: string;
          last_seen_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          role?: UserRole;
          plan?: string;
          password_hash?: string;
          created_at?: string;
          last_seen_at?: string | null;
        };
        Relationships: [];
      };
      mediator_assignments: {
        Row: {
          event_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          event_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          event_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      participants: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          contact: string;
          questions_count: number;
          lgpd_accepted: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          event_id: string;
          name: string;
          contact: string;
          questions_count?: number;
          lgpd_accepted?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          name?: string;
          contact?: string;
          questions_count?: number;
          lgpd_accepted?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      registrations: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          email: string;
          phone: string | null;
          document: string | null;
          author_ip: string | null;
          checked_in: boolean;
          checked_in_at: string | null;
          kit_delivered: boolean;
          kit_delivered_at: string | null;
          drawn: boolean;
          drawn_at: string | null;
          lgpd_accepted: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          event_id: string;
          name: string;
          email: string;
          phone?: string | null;
          document?: string | null;
          author_ip?: string | null;
          checked_in?: boolean;
          checked_in_at?: string | null;
          kit_delivered?: boolean;
          kit_delivered_at?: string | null;
          drawn?: boolean;
          drawn_at?: string | null;
          lgpd_accepted?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          document?: string | null;
          author_ip?: string | null;
          checked_in?: boolean;
          checked_in_at?: string | null;
          kit_delivered?: boolean;
          kit_delivered_at?: string | null;
          drawn?: boolean;
          drawn_at?: string | null;
          lgpd_accepted?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      event_payments: {
        Row: {
          id: string;
          event_id: string | null;
          owner_id: string;
          stripe_session_id: string;
          stripe_payment_intent_id: string | null;
          amount: number;
          currency: string;
          status: string;
          event_data: unknown;
          created_at: string;
          paid_at: string | null;
        };
        Insert: {
          id: string;
          event_id?: string | null;
          owner_id: string;
          stripe_session_id: string;
          stripe_payment_intent_id?: string | null;
          amount: number;
          currency?: string;
          status?: string;
          event_data?: unknown;
          created_at?: string;
          paid_at?: string | null;
        };
        Update: {
          id?: string;
          event_id?: string | null;
          owner_id?: string;
          stripe_session_id?: string;
          stripe_payment_intent_id?: string | null;
          amount?: number;
          currency?: string;
          status?: string;
          event_data?: unknown;
          created_at?: string;
          paid_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      event_status: EventStatus;
      question_status: QuestionStatus;
      user_role: UserRole;
    };
  };
}
