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
      ai_access_blocks: {
        Row: {
          created_at: string
          reason: string
          scope: string
          status: number
        }
        Insert: {
          created_at?: string
          reason: string
          scope: string
          status: number
        }
        Update: {
          created_at?: string
          reason?: string
          scope?: string
          status?: number
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          request_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          request_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          request_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string
          owner_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          owner_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          owner_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_contacts: {
        Row: {
          id: string
          is_public: boolean
          kind: string
          owner_id: string
          value: string
        }
        Insert: {
          id?: string
          is_public?: boolean
          kind: string
          owner_id: string
          value: string
        }
        Update: {
          id?: string
          is_public?: boolean
          kind?: string
          owner_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_contacts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          area: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          display_name: string
          facebook: string | null
          id: string
          instagram: string | null
          phone: string | null
          preferred_lang: string
          professional_details: Json
          title: string | null
          website: string | null
        }
        Insert: {
          area?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string
          facebook?: string | null
          id: string
          instagram?: string | null
          phone?: string | null
          preferred_lang?: string
          professional_details?: Json
          title?: string | null
          website?: string | null
        }
        Update: {
          area?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string
          facebook?: string | null
          id?: string
          instagram?: string | null
          phone?: string | null
          preferred_lang?: string
          professional_details?: Json
          title?: string | null
          website?: string | null
        }
        Relationships: []
      }
      requests: {
        Row: {
          client_id: string
          created_at: string
          details: Json
          id: string
          message: string
          provider_id: string
          service_id: string
          status: string
        }
        Insert: {
          client_id: string
          created_at?: string
          details?: Json
          id?: string
          message: string
          provider_id: string
          service_id: string
          status?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          details?: Json
          id?: string
          message?: string
          provider_id?: string
          service_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          archived: boolean
          category: string
          city: string
          created_at: string
          description: string
          details: Json
          id: string
          image_url: string | null
          owner_id: string
          price: number | null
          price_model: string
          remote: boolean
          status: string
          title: string
        }
        Insert: {
          archived?: boolean
          category: string
          city: string
          created_at?: string
          description: string
          details?: Json
          id?: string
          image_url?: string | null
          owner_id: string
          price?: number | null
          price_model?: string
          remote?: boolean
          status?: string
          title: string
        }
        Update: {
          archived?: boolean
          category?: string
          city?: string
          created_at?: string
          description?: string
          details?: Json
          id?: string
          image_url?: string | null
          owner_id?: string
          price?: number | null
          price_model?: string
          remote?: boolean
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
