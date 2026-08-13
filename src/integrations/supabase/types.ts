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
      access_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          label: string
          last_used_at: string | null
          revoked_at: string | null
          server_id: string
          token_hash: string
          token_prefix: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          label?: string
          last_used_at?: string | null
          revoked_at?: string | null
          server_id: string
          token_hash: string
          token_prefix: string
          user_id?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          label?: string
          last_used_at?: string | null
          revoked_at?: string | null
          server_id?: string
          token_hash?: string
          token_prefix?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_tokens_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          args: Json
          created_at: string
          decided_at: string | null
          expires_at: string
          id: string
          server_id: string
          status: string
          tool_name: string
          user_id: string
        }
        Insert: {
          args?: Json
          created_at?: string
          decided_at?: string | null
          expires_at?: string
          id?: string
          server_id: string
          status?: string
          tool_name: string
          user_id: string
        }
        Update: {
          args?: Json
          created_at?: string
          decided_at?: string | null
          expires_at?: string
          id?: string
          server_id?: string
          status?: string
          tool_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          event: string
          id: string
          level: string
          message: string
          meta: Json
          server_id: string | null
          status_code: number | null
          tool_name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          event: string
          id?: string
          level?: string
          message?: string
          meta?: Json
          server_id?: string | null
          status_code?: number | null
          tool_name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          event?: string
          id?: string
          level?: string
          message?: string
          meta?: Json
          server_id?: string | null
          status_code?: number | null
          tool_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      credentials: {
        Row: {
          created_at: string
          encrypted_value: string
          expires_at: string | null
          header_name: string
          id: string
          kind: Database["public"]["Enums"]["auth_kind"]
          label: string
          rotated_at: string
          server_id: string
          updated_at: string
          user_id: string
          value_template: string
        }
        Insert: {
          created_at?: string
          encrypted_value: string
          expires_at?: string | null
          header_name?: string
          id?: string
          kind?: Database["public"]["Enums"]["auth_kind"]
          label?: string
          rotated_at?: string
          server_id: string
          updated_at?: string
          user_id?: string
          value_template?: string
        }
        Update: {
          created_at?: string
          encrypted_value?: string
          expires_at?: string | null
          header_name?: string
          id?: string
          kind?: Database["public"]["Enums"]["auth_kind"]
          label?: string
          rotated_at?: string
          server_id?: string
          updated_at?: string
          user_id?: string
          value_template?: string
        }
        Relationships: [
          {
            foreignKeyName: "credentials_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_clients: {
        Row: {
          client_id: string
          client_secret_hash: string | null
          created_at: string
          disabled: boolean
          id: string
          last_seen_at: string | null
          name: string
          redirect_uris: string[]
          registration_kind: string
          server_id: string
          user_id: string | null
        }
        Insert: {
          client_id: string
          client_secret_hash?: string | null
          created_at?: string
          disabled?: boolean
          id?: string
          last_seen_at?: string | null
          name?: string
          redirect_uris?: string[]
          registration_kind?: string
          server_id: string
          user_id?: string | null
        }
        Update: {
          client_id?: string
          client_secret_hash?: string | null
          created_at?: string
          disabled?: boolean
          id?: string
          last_seen_at?: string | null
          name?: string
          redirect_uris?: string[]
          registration_kind?: string
          server_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oauth_clients_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_grants: {
        Row: {
          access_expires_at: string
          access_token_hash: string
          call_count: number
          client_id: string
          client_name: string
          created_at: string
          grant_expires_at: string
          id: string
          last_used_at: string | null
          max_calls: number | null
          refresh_token_hash: string | null
          revoked_at: string | null
          scopes: string[]
          server_id: string
          user_id: string
        }
        Insert: {
          access_expires_at: string
          access_token_hash: string
          call_count?: number
          client_id: string
          client_name?: string
          created_at?: string
          grant_expires_at: string
          id?: string
          last_used_at?: string | null
          max_calls?: number | null
          refresh_token_hash?: string | null
          revoked_at?: string | null
          scopes?: string[]
          server_id: string
          user_id: string
        }
        Update: {
          access_expires_at?: string
          access_token_hash?: string
          call_count?: number
          client_id?: string
          client_name?: string
          created_at?: string
          grant_expires_at?: string
          id?: string
          last_used_at?: string | null
          max_calls?: number | null
          refresh_token_hash?: string | null
          revoked_at?: string | null
          scopes?: string[]
          server_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_grants_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_requests: {
        Row: {
          client_id: string
          code_challenge: string
          code_challenge_method: string
          code_hash: string | null
          consumed_at: string | null
          created_at: string
          expires_at: string
          grant_ttl_minutes: number
          granted_scopes: string[]
          id: string
          max_calls: number | null
          redirect_uri: string
          requested_scopes: string[]
          resource: string | null
          server_id: string
          state: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          client_id: string
          code_challenge: string
          code_challenge_method?: string
          code_hash?: string | null
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          grant_ttl_minutes?: number
          granted_scopes?: string[]
          id?: string
          max_calls?: number | null
          redirect_uri: string
          requested_scopes?: string[]
          resource?: string | null
          server_id: string
          state?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          client_id?: string
          code_challenge?: string
          code_challenge_method?: string
          code_hash?: string | null
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          grant_ttl_minutes?: number
          granted_scopes?: string[]
          id?: string
          max_calls?: number | null
          redirect_uri?: string
          requested_scopes?: string[]
          resource?: string | null
          server_id?: string
          state?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oauth_requests_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      servers: {
        Row: {
          auth_type: Database["public"]["Enums"]["auth_kind"]
          base_url: string
          created_at: string
          description: string
          enabled: boolean
          health: Database["public"]["Enums"]["health_state"]
          id: string
          instructions: string
          kind: Database["public"]["Enums"]["server_kind"]
          last_health_check: string | null
          name: string
          slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_type?: Database["public"]["Enums"]["auth_kind"]
          base_url?: string
          created_at?: string
          description?: string
          enabled?: boolean
          health?: Database["public"]["Enums"]["health_state"]
          id?: string
          instructions?: string
          kind?: Database["public"]["Enums"]["server_kind"]
          last_health_check?: string | null
          name: string
          slug: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          auth_type?: Database["public"]["Enums"]["auth_kind"]
          base_url?: string
          created_at?: string
          description?: string
          enabled?: boolean
          health?: Database["public"]["Enums"]["health_state"]
          id?: string
          instructions?: string
          kind?: Database["public"]["Enums"]["server_kind"]
          last_health_check?: string | null
          name?: string
          slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tools: {
        Row: {
          approval: Database["public"]["Enums"]["approval_mode"]
          body_template: Json | null
          created_at: string
          description: string
          enabled: boolean
          header_template: Json
          id: string
          input_schema: Json
          method: string
          name: string
          path: string
          scopes: string[]
          server_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approval?: Database["public"]["Enums"]["approval_mode"]
          body_template?: Json | null
          created_at?: string
          description?: string
          enabled?: boolean
          header_template?: Json
          id?: string
          input_schema?: Json
          method?: string
          name: string
          path?: string
          scopes?: string[]
          server_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          approval?: Database["public"]["Enums"]["approval_mode"]
          body_template?: Json | null
          created_at?: string
          description?: string
          enabled?: boolean
          header_template?: Json
          id?: string
          input_schema?: Json
          method?: string
          name?: string
          path?: string
          scopes?: string[]
          server_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tools_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
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
      approval_mode: "always_ask" | "always_allow"
      auth_kind: "none" | "api_key" | "bearer" | "basic" | "oauth2"
      health_state: "unknown" | "healthy" | "degraded" | "down"
      server_kind: "mcp" | "connector"
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
      approval_mode: ["always_ask", "always_allow"],
      auth_kind: ["none", "api_key", "bearer", "basic", "oauth2"],
      health_state: ["unknown", "healthy", "degraded", "down"],
      server_kind: ["mcp", "connector"],
    },
  },
} as const
