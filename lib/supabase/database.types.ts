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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      box_tiers: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          price_cents: number
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price_cents: number
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price_cents?: number
          sort_order?: number
        }
        Relationships: []
      }
      customers: {
        Row: {
          auth_id: string | null
          created_at: string
          email: string | null
          id: string
          is_admin: boolean
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          auth_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_admin?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          auth_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_admin?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      delivery_windows: {
        Row: {
          capacity: number | null
          created_at: string
          cycle_id: string
          ends_at: string
          id: string
          kind: Database["public"]["Enums"]["fulfillment_kind"]
          label: string
          sort_order: number
          starts_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          cycle_id: string
          ends_at: string
          id?: string
          kind: Database["public"]["Enums"]["fulfillment_kind"]
          label: string
          sort_order?: number
          starts_at: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          cycle_id?: string
          ends_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["fulfillment_kind"]
          label?: string
          sort_order?: number
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_windows_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "distribution_cycles"
            referencedColumns: ["id"]
          },
        ]
      }

      distribution_cycles: {
        Row: {
          created_at: string
          cycle_date: string
          id: string
          notes: string | null
          orders_close_at: string | null
          orders_open_at: string | null
          status: Database["public"]["Enums"]["cycle_status"]
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cycle_date: string
          id?: string
          notes?: string | null
          orders_close_at?: string | null
          orders_open_at?: string | null
          status?: Database["public"]["Enums"]["cycle_status"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cycle_date?: string
          id?: string
          notes?: string | null
          orders_close_at?: string | null
          orders_open_at?: string | null
          status?: Database["public"]["Enums"]["cycle_status"]
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }

      farms: {
        Row: {
          contact: string | null
          created_at: string
          id: string
          location: string | null
          name: string
          notes: string | null
        }
        Insert: {
          contact?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name: string
          notes?: string | null
        }
        Update: {
          contact?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          email: string
          handled: boolean
          id: string
          name: string
          subject: string | null
        }
        Insert: {
          body: string
          created_at?: string
          email: string
          handled?: boolean
          id?: string
          name: string
          subject?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          email?: string
          handled?: boolean
          id?: string
          name?: string
          subject?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          box_tier_id: string | null
          description: string
          id: string
          line_total_cents: number
          order_id: string
          quantity: number
          unit_price_cents: number
        }
        Insert: {
          box_tier_id?: string | null
          description: string
          id?: string
          line_total_cents: number
          order_id: string
          quantity: number
          unit_price_cents: number
        }
        Update: {
          box_tier_id?: string | null
          description?: string
          id?: string
          line_total_cents?: number
          order_id?: string
          quantity?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_box_tier_id_fkey"
            columns: ["box_tier_id"]
            isOneToOne: false
            referencedRelation: "box_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_paid_cents: number
          checkout_method: Database["public"]["Enums"]["checkout_method"]
          contact_email: string | null
          contact_name: string
          contact_phone: string | null
          created_at: string
          customer_id: string | null
          delivery_fee_cents: number
          dietary_notes: string | null
          entry_source: string | null
          fulfilled_at: string | null
          fulfillment: Database["public"]["Enums"]["fulfillment_kind"]
          id: string
          notes: string | null
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          placed_at: string
          ship_apt: string | null
          ship_city: string | null
          ship_state: string | null
          ship_street: string | null
          ship_zip: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal_cents: number
          time_window: Database["public"]["Enums"]["time_window"] | null
          window_id: string | null
          total_cents: number
          updated_at: string
        }
        Insert: {
          amount_paid_cents?: number
          checkout_method?: Database["public"]["Enums"]["checkout_method"]
          contact_email?: string | null
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          customer_id?: string | null
          delivery_fee_cents?: number
          dietary_notes?: string | null
          entry_source?: string | null
          fulfilled_at?: string | null
          fulfillment: Database["public"]["Enums"]["fulfillment_kind"]
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          placed_at?: string
          ship_apt?: string | null
          ship_city?: string | null
          ship_state?: string | null
          ship_street?: string | null
          ship_zip?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number
          time_window?: Database["public"]["Enums"]["time_window"] | null
          window_id?: string | null
          total_cents?: number
          updated_at?: string
        }
        Update: {
          amount_paid_cents?: number
          checkout_method?: Database["public"]["Enums"]["checkout_method"]
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          customer_id?: string | null
          delivery_fee_cents?: number
          dietary_notes?: string | null
          entry_source?: string | null
          fulfilled_at?: string | null
          fulfillment?: Database["public"]["Enums"]["fulfillment_kind"]
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          placed_at?: string
          ship_apt?: string | null
          ship_city?: string | null
          ship_state?: string | null
          ship_street?: string | null
          ship_zip?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number
          time_window?: Database["public"]["Enums"]["time_window"] | null
          window_id?: string | null
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          check_number: string | null
          collected_by: string | null
          created_at: string
          deposited_at: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          raw_payload: Json | null
          received_at: string | null
          status: string
          stripe_event_id: string | null
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount_cents: number
          check_number?: string | null
          collected_by?: string | null
          created_at?: string
          deposited_at?: string | null
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          raw_payload?: Json | null
          received_at?: string | null
          status?: string
          stripe_event_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount_cents?: number
          check_number?: string | null
          collected_by?: string | null
          created_at?: string
          deposited_at?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          order_id?: string
          raw_payload?: Json | null
          received_at?: string | null
          status?: string
          stripe_event_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      produce_items: {
        Row: {
          active: boolean
          created_at: string
          default_unit: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          default_unit?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          default_unit?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          cost_cents: number
          created_at: string
          description: string | null
          farm_id: string | null
          id: string
          invoice_ref: string | null
          notes: string | null
          produce_item_id: string | null
          purchase_date: string
          quantity: number | null
          unit: string | null
        }
        Insert: {
          cost_cents?: number
          created_at?: string
          description?: string | null
          farm_id?: string | null
          id?: string
          invoice_ref?: string | null
          notes?: string | null
          produce_item_id?: string | null
          purchase_date?: string
          quantity?: number | null
          unit?: string | null
        }
        Update: {
          cost_cents?: number
          created_at?: string
          description?: string | null
          farm_id?: string | null
          id?: string
          invoice_ref?: string | null
          notes?: string | null
          produce_item_id?: string | null
          purchase_date?: string
          quantity?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_produce_item_id_fkey"
            columns: ["produce_item_id"]
            isOneToOne: false
            referencedRelation: "produce_items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      owns_customer: { Args: { cid: string }; Returns: boolean }
    }
    Enums: {
      checkout_method: "guest" | "account"
      fulfillment_kind: "pickup" | "delivery"
      order_status:
        | "pending"
        | "confirmed"
        | "packed"
        | "fulfilled"
        | "cancelled"
      payment_method: "card" | "cash" | "check" | "venmo" | "other"
      payment_status: "unpaid" | "partial" | "paid" | "refunded"
      cycle_status: "draft" | "open" | "closed" | "fulfilled"
      time_window: "morning" | "afternoon" | "evening"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      checkout_method: ["guest", "account"],
      cycle_status: ["draft", "open", "closed", "fulfilled"],
      fulfillment_kind: ["pickup", "delivery"],
      order_status: [
        "pending",
        "confirmed",
        "packed",
        "fulfilled",
        "cancelled",
      ],
      payment_method: ["card", "cash", "check", "venmo", "other"],
      payment_status: ["unpaid", "partial", "paid", "refunded"],
      time_window: ["morning", "afternoon", "evening"],
    },
  },
} as const
