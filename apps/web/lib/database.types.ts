export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      agencies: {
        Row: {
          contact_number: string;
          created_at: string;
          id: string;
          name: string;
          office_address: string;
          onboarding_status: Database["public"]["Enums"]["onboarding_status"];
          timezone: string;
          transfer_number: string | null;
          updated_at: string;
          vapi_assistant_id: string | null;
          vapi_phone_number: string | null;
          vapi_phone_number_id: string | null;
        };
        Insert: {
          contact_number: string;
          created_at?: string;
          id?: string;
          name: string;
          office_address: string;
          onboarding_status?: Database["public"]["Enums"]["onboarding_status"];
          timezone: string;
          transfer_number?: string | null;
          updated_at?: string;
          vapi_assistant_id?: string | null;
          vapi_phone_number?: string | null;
          vapi_phone_number_id?: string | null;
        };
        Update: {
          contact_number?: string;
          created_at?: string;
          id?: string;
          name?: string;
          office_address?: string;
          onboarding_status?: Database["public"]["Enums"]["onboarding_status"];
          timezone?: string;
          transfer_number?: string | null;
          updated_at?: string;
          vapi_assistant_id?: string | null;
          vapi_phone_number?: string | null;
          vapi_phone_number_id?: string | null;
        };
        Relationships: [];
      };
      agency_business_hours: {
        Row: {
          agency_id: string;
          created_at: string;
          end_time_local: string | null;
          id: string;
          is_closed: boolean;
          start_time_local: string | null;
          updated_at: string;
          weekday: number;
        };
        Insert: {
          agency_id: string;
          created_at?: string;
          end_time_local?: string | null;
          id?: string;
          is_closed?: boolean;
          start_time_local?: string | null;
          updated_at?: string;
          weekday: number;
        };
        Update: {
          agency_id?: string;
          created_at?: string;
          end_time_local?: string | null;
          id?: string;
          is_closed?: boolean;
          start_time_local?: string | null;
          updated_at?: string;
          weekday?: number;
        };
        Relationships: [];
      };
      agency_users: {
        Row: {
          agency_id: string;
          auth_user_id: string;
          created_at: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          agency_id: string;
          auth_user_id: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
        };
        Update: {
          agency_id?: string;
          auth_user_id?: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      calls: {
        Row: {
          agency_id: string;
          call_outcome: Database["public"]["Enums"]["call_outcome"];
          caller_name: string | null;
          caller_phone: string | null;
          created_at: string;
          id: string;
          managed_unit_id: string | null;
          transfer_attempted: boolean;
          transfer_completed: boolean;
          updated_at: string;
          vapi_call_id: string;
        };
        Insert: {
          agency_id: string;
          call_outcome: Database["public"]["Enums"]["call_outcome"];
          caller_name?: string | null;
          caller_phone?: string | null;
          created_at?: string;
          id?: string;
          managed_unit_id?: string | null;
          transfer_attempted?: boolean;
          transfer_completed?: boolean;
          updated_at?: string;
          vapi_call_id: string;
        };
        Update: {
          agency_id?: string;
          call_outcome?: Database["public"]["Enums"]["call_outcome"];
          caller_name?: string | null;
          caller_phone?: string | null;
          created_at?: string;
          id?: string;
          managed_unit_id?: string | null;
          transfer_attempted?: boolean;
          transfer_completed?: boolean;
          updated_at?: string;
          vapi_call_id?: string;
        };
        Relationships: [];
      };
      managed_units: {
        Row: {
          agency_id: string;
          city: string;
          created_at: string;
          display_address: string;
          id: string;
          is_active: boolean;
          normalized_property_key: string;
          postal_code: string;
          property_address_line_1: string;
          property_address_line_2: string | null;
          state: string;
          unit_number: string;
          updated_at: string;
        };
        Insert: {
          agency_id: string;
          city: string;
          created_at?: string;
          display_address: string;
          id?: string;
          is_active?: boolean;
          normalized_property_key: string;
          postal_code: string;
          property_address_line_1: string;
          property_address_line_2?: string | null;
          state: string;
          unit_number: string;
          updated_at?: string;
        };
        Update: {
          agency_id?: string;
          city?: string;
          created_at?: string;
          display_address?: string;
          id?: string;
          is_active?: boolean;
          normalized_property_key?: string;
          postal_code?: string;
          property_address_line_1?: string;
          property_address_line_2?: string | null;
          state?: string;
          unit_number?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      service_catalog_chunks: {
        Row: {
          agency_id: string;
          content: string;
          created_at: string;
          document_id: string;
          id: string;
          metadata_json: Json;
          updated_at: string;
          chunk_index: number;
        };
        Insert: {
          agency_id: string;
          content: string;
          created_at?: string;
          document_id: string;
          id?: string;
          metadata_json?: Json;
          updated_at?: string;
          chunk_index: number;
        };
        Update: {
          agency_id?: string;
          content?: string;
          created_at?: string;
          document_id?: string;
          id?: string;
          metadata_json?: Json;
          updated_at?: string;
          chunk_index?: number;
        };
        Relationships: [];
      };
      service_catalog_documents: {
        Row: {
          agency_id: string;
          byte_size: number | null;
          created_at: string;
          file_hash: string | null;
          id: string;
          ingested_at: string | null;
          ingestion_error: string | null;
          ingestion_status: Database["public"]["Enums"]["catalog_ingestion_status"];
          mime_type: string | null;
          original_filename: string;
          storage_bucket: string;
          storage_path: string;
          updated_at: string;
        };
        Insert: {
          agency_id: string;
          byte_size?: number | null;
          created_at?: string;
          file_hash?: string | null;
          id?: string;
          ingested_at?: string | null;
          ingestion_error?: string | null;
          ingestion_status?: Database["public"]["Enums"]["catalog_ingestion_status"];
          mime_type?: string | null;
          original_filename: string;
          storage_bucket?: string;
          storage_path: string;
          updated_at?: string;
        };
        Update: {
          agency_id?: string;
          byte_size?: number | null;
          created_at?: string;
          file_hash?: string | null;
          id?: string;
          ingested_at?: string | null;
          ingestion_error?: string | null;
          ingestion_status?: Database["public"]["Enums"]["catalog_ingestion_status"];
          mime_type?: string | null;
          original_filename?: string;
          storage_bucket?: string;
          storage_path?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ticket_events: {
        Row: {
          actor_type: string;
          agency_id: string;
          created_at: string;
          event_payload: Json;
          event_type: string;
          id: string;
          ticket_id: string;
          updated_at: string;
        };
        Insert: {
          actor_type: string;
          agency_id: string;
          created_at?: string;
          event_payload?: Json;
          event_type: string;
          id?: string;
          ticket_id: string;
          updated_at?: string;
        };
        Update: {
          actor_type?: string;
          agency_id?: string;
          created_at?: string;
          event_payload?: Json;
          event_type?: string;
          id?: string;
          ticket_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tickets: {
        Row: {
          agency_id: string;
          caller_name: string;
          caller_phone: string;
          category: string | null;
          created_at: string;
          created_by_channel_metadata: Json;
          id: string;
          issue_details: string;
          issue_summary: string;
          managed_unit_id: string;
          priority: Database["public"]["Enums"]["ticket_priority"];
          source: string;
          status: Database["public"]["Enums"]["ticket_status"];
          updated_at: string;
        };
        Insert: {
          agency_id: string;
          caller_name: string;
          caller_phone: string;
          category?: string | null;
          created_at?: string;
          created_by_channel_metadata?: Json;
          id?: string;
          issue_details: string;
          issue_summary: string;
          managed_unit_id: string;
          priority?: Database["public"]["Enums"]["ticket_priority"];
          source?: string;
          status?: Database["public"]["Enums"]["ticket_status"];
          updated_at?: string;
        };
        Update: {
          agency_id?: string;
          caller_name?: string;
          caller_phone?: string;
          category?: string | null;
          created_at?: string;
          created_by_channel_metadata?: Json;
          id?: string;
          issue_details?: string;
          issue_summary?: string;
          managed_unit_id?: string;
          priority?: Database["public"]["Enums"]["ticket_priority"];
          source?: string;
          status?: Database["public"]["Enums"]["ticket_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      agency_is_open: {
        Args: {
          filter_agency_id: string;
          at_ts: string;
        };
        Returns: boolean;
      };
      bootstrap_agency: {
        Args: {
          p_auth_user_id: string;
          p_name: string;
          p_office_address: string;
          p_contact_number: string;
          p_transfer_number?: string | null;
          p_timezone: string;
        };
        Returns: Database["public"]["Tables"]["agencies"]["Row"];
      };
      current_agency_id: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      match_service_catalog_chunks: {
        Args: {
          filter_agency_id: string;
          query_embedding: string;
          match_count?: number;
        };
        Returns: {
          agency_id: string;
          chunk_index: number;
          content: string;
          document_id: string;
          id: string;
          metadata_json: Json;
          similarity: number;
        }[];
      };
    };
    Enums: {
      call_outcome:
        | "ticket_created"
        | "guidance_only"
        | "transferred"
        | "out_of_context"
        | "invalid_unit"
        | "failed";
      catalog_ingestion_status: "pending" | "processing" | "ready" | "failed";
      onboarding_status: "draft" | "catalog_processing" | "provisioning" | "ready" | "failed";
      ticket_priority: "low" | "medium" | "high" | "urgent";
      ticket_status: "new" | "in_progress" | "completed" | "cancelled";
    };
    CompositeTypes: Record<string, never>;
  };
};
