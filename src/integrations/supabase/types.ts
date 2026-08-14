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
      dpop_proofs: {
        Row: {
          created_at: string
          expires_at: string
          jkt: string
          jti: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          jkt: string
          jti: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          jkt?: string
          jti?: string
        }
        Relationships: []
      }
      oauth_clients: {
        Row: {
          client_id: string
          client_secret_hash: string | null
          created_at: string
          disabled: boolean
          dpop_mode: string
          dpop_observed: boolean
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
          dpop_mode?: string
          dpop_observed?: boolean
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
          dpop_mode?: string
          dpop_observed?: boolean
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
          cnf_jkt: string | null
          created_at: string
          grant_expires_at: string
          id: string
          last_used_at: string | null
          max_calls: number | null
          rate_limit_per_min: number | null
          refresh_generation: number
          refresh_token_hash: string | null
          retired_refresh_hash: string | null
          revoked_at: string | null
          scopes: string[]
          server_id: string
          user_id: string
          webauthn_credential_id: string | null
        }
        Insert: {
          access_expires_at: string
          access_token_hash: string
          call_count?: number
          client_id: string
          client_name?: string
          cnf_jkt?: string | null
          created_at?: string
          grant_expires_at: string
          id?: string
          last_used_at?: string | null
          max_calls?: number | null
          rate_limit_per_min?: number | null
          refresh_generation?: number
          refresh_token_hash?: string | null
          retired_refresh_hash?: string | null
          revoked_at?: string | null
          scopes?: string[]
          server_id: string
          user_id: string
          webauthn_credential_id?: string | null
        }
        Update: {
          access_expires_at?: string
          access_token_hash?: string
          call_count?: number
          client_id?: string
          client_name?: string
          cnf_jkt?: string | null
          created_at?: string
          grant_expires_at?: string
          id?: string
          last_used_at?: string | null
          max_calls?: number | null
          rate_limit_per_min?: number | null
          refresh_generation?: number
          refresh_token_hash?: string | null
          retired_refresh_hash?: string | null
          revoked_at?: string | null
          scopes?: string[]
          server_id?: string
          user_id?: string
          webauthn_credential_id?: string | null
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
          webauthn_credential_id: string | null
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
          webauthn_credential_id?: string | null
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
          webauthn_credential_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oauth_requests_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_requests_webauthn_credential_id_fkey"
            columns: ["webauthn_credential_id"]
            isOneToOne: false
            referencedRelation: "webauthn_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_invites: {
        Row: {
          created_at: string
          created_by: string
          email: string
          id: string
          role: Database["public"]["Enums"]["operator_role"]
        }
        Insert: {
          created_at?: string
          created_by: string
          email: string
          id?: string
          role?: Database["public"]["Enums"]["operator_role"]
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["operator_role"]
        }
        Relationships: []
      }
      operators: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          role: Database["public"]["Enums"]["operator_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          role?: Database["public"]["Enums"]["operator_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          role?: Database["public"]["Enums"]["operator_role"]
          user_id?: string
        }
        Relationships: []
      }
      rate_counters: {
        Row: {
          count: number
          subject: string
          window_start: string
        }
        Insert: {
          count?: number
          subject: string
          window_start: string
        }
        Update: {
          count?: number
          subject?: string
          window_start?: string
        }
        Relationships: []
      }
      servers: {
        Row: {
          auth_type: Database["public"]["Enums"]["auth_kind"]
          base_url: string
          created_at: string
          description: string
          dpop_mode: string
          enabled: boolean
          health: Database["public"]["Enums"]["health_state"]
          id: string
          instructions: string
          kind: Database["public"]["Enums"]["server_kind"]
          last_health_check: string | null
          name: string
          rate_limit_per_min: number
          slug: string
          updated_at: string
          user_id: string
          webauthn_authenticator: string
          webauthn_policy: string
          webauthn_sso_fallback: boolean
        }
        Insert: {
          auth_type?: Database["public"]["Enums"]["auth_kind"]
          base_url?: string
          created_at?: string
          description?: string
          dpop_mode?: string
          enabled?: boolean
          health?: Database["public"]["Enums"]["health_state"]
          id?: string
          instructions?: string
          kind?: Database["public"]["Enums"]["server_kind"]
          last_health_check?: string | null
          name: string
          rate_limit_per_min?: number
          slug: string
          updated_at?: string
          user_id?: string
          webauthn_authenticator?: string
          webauthn_policy?: string
          webauthn_sso_fallback?: boolean
        }
        Update: {
          auth_type?: Database["public"]["Enums"]["auth_kind"]
          base_url?: string
          created_at?: string
          description?: string
          dpop_mode?: string
          enabled?: boolean
          health?: Database["public"]["Enums"]["health_state"]
          id?: string
          instructions?: string
          kind?: Database["public"]["Enums"]["server_kind"]
          last_health_check?: string | null
          name?: string
          rate_limit_per_min?: number
          slug?: string
          updated_at?: string
          user_id?: string
          webauthn_authenticator?: string
          webauthn_policy?: string
          webauthn_sso_fallback?: boolean
        }
        Relationships: []
      }
      signing_keys: {
        Row: {
          active: boolean
          created_at: string
          id: string
          kid: string
          private_jwk_encrypted: string
          public_jwk: Json
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          kid: string
          private_jwk_encrypted: string
          public_jwk: Json
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          kid?: string
          private_jwk_encrypted?: string
          public_jwk?: Json
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
      upstream_oauth: {
        Row: {
          audience: string | null
          authorize_url: string
          client_id: string
          created_at: string
          encrypted_client_secret: string | null
          header_name: string
          id: string
          provider: string
          scopes: string[]
          server_id: string
          token_url: string
          updated_at: string
          user_id: string
          value_template: string
        }
        Insert: {
          audience?: string | null
          authorize_url: string
          client_id: string
          created_at?: string
          encrypted_client_secret?: string | null
          header_name?: string
          id?: string
          provider?: string
          scopes?: string[]
          server_id: string
          token_url: string
          updated_at?: string
          user_id: string
          value_template?: string
        }
        Update: {
          audience?: string | null
          authorize_url?: string
          client_id?: string
          created_at?: string
          encrypted_client_secret?: string | null
          header_name?: string
          id?: string
          provider?: string
          scopes?: string[]
          server_id?: string
          token_url?: string
          updated_at?: string
          user_id?: string
          value_template?: string
        }
        Relationships: [
          {
            foreignKeyName: "upstream_oauth_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: true
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      upstream_sessions: {
        Row: {
          code_verifier: string
          created_at: string
          expires_at: string
          id: string
          redirect_uri: string
          server_id: string
          state: string
        }
        Insert: {
          code_verifier: string
          created_at?: string
          expires_at: string
          id?: string
          redirect_uri: string
          server_id: string
          state: string
        }
        Update: {
          code_verifier?: string
          created_at?: string
          expires_at?: string
          id?: string
          redirect_uri?: string
          server_id?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "upstream_sessions_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      upstream_tokens: {
        Row: {
          created_at: string
          encrypted_access: string
          encrypted_refresh: string | null
          expires_at: string | null
          id: string
          rotated_at: string
          rotations: number
          scope: string
          server_id: string
          token_type: string
        }
        Insert: {
          created_at?: string
          encrypted_access: string
          encrypted_refresh?: string | null
          expires_at?: string | null
          id?: string
          rotated_at?: string
          rotations?: number
          scope?: string
          server_id: string
          token_type?: string
        }
        Update: {
          created_at?: string
          encrypted_access?: string
          encrypted_refresh?: string | null
          expires_at?: string | null
          id?: string
          rotated_at?: string
          rotations?: number
          scope?: string
          server_id?: string
          token_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "upstream_tokens_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: true
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      webauthn_challenges: {
        Row: {
          challenge: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          purpose: string
          request_id: string | null
          user_id: string
        }
        Insert: {
          challenge: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          purpose: string
          request_id?: string | null
          user_id: string
        }
        Update: {
          challenge?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          purpose?: string
          request_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      webauthn_credentials: {
        Row: {
          aaguid: string | null
          attachment: string
          backed_up: boolean
          counter: number
          created_at: string
          credential_id: string
          id: string
          label: string
          last_used_at: string | null
          public_key: string
          transports: string[]
          user_id: string
        }
        Insert: {
          aaguid?: string | null
          attachment?: string
          backed_up?: boolean
          counter?: number
          created_at?: string
          credential_id: string
          id?: string
          label?: string
          last_used_at?: string | null
          public_key: string
          transports?: string[]
          user_id: string
        }
        Update: {
          aaguid?: string | null
          attachment?: string
          backed_up?: boolean
          counter?: number
          created_at?: string
          credential_id?: string
          id?: string
          label?: string
          last_used_at?: string | null
          public_key?: string
          transports?: string[]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_operator: { Args: { _user_id: string }; Returns: boolean }
      rate_hit: {
        Args: { _subject: string; _window_seconds: number }
        Returns: number
      }
    }
    Enums: {
      approval_mode: "always_ask" | "always_allow"
      auth_kind: "none" | "api_key" | "bearer" | "basic" | "oauth2"
      health_state: "unknown" | "healthy" | "degraded" | "down"
      operator_role: "owner" | "admin" | "viewer"
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
      operator_role: ["owner", "admin", "viewer"],
      server_kind: ["mcp", "connector"],
    },
  },
} as const
