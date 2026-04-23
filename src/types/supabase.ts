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
      order_items: {
        Row: {
          created_at: string | null
          order_id: string
          price: number
          product_code: string | null
          product_id: string
          product_name: string
          quantity: number
        }
        Insert: {
          created_at?: string | null
          order_id: string
          price: number
          product_code?: string | null
          product_id: string
          product_name: string
          quantity: number
        }
        Update: {
          created_at?: string | null
          order_id?: string
          price?: number
          product_code?: string | null
          product_id?: string
          product_name?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_histories: {
        Row: {
          actor_name: string | null
          actor_type: string
          created_at: string
          from_status: string | null
          id: string
          order_id: string
          reason: string | null
          status_type: string
          to_status: string
        }
        Insert: {
          actor_name?: string | null
          actor_type?: string
          created_at?: string
          from_status?: string | null
          id?: string
          order_id: string
          reason?: string | null
          status_type: string
          to_status: string
        }
        Update: {
          actor_name?: string | null
          actor_type?: string
          created_at?: string
          from_status?: string | null
          id?: string
          order_id?: string
          reason?: string | null
          status_type?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_histories_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          memo: string | null
          order_status: string
          order_number: string
          payment_method: string | null
          payment_status: string
          shipping_address: string | null
          shipping_status: string
          status: string
          stock_status: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          memo?: string | null
          order_status?: string
          order_number: string
          payment_method?: string | null
          payment_status?: string
          shipping_address?: string | null
          shipping_status?: string
          status?: string
          stock_status?: string
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          memo?: string | null
          order_status?: string
          order_number?: string
          payment_method?: string | null
          payment_status?: string
          shipping_address?: string | null
          shipping_status?: string
          status?: string
          stock_status?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      product_images: {
        Row: {
          format: string | null
          height: number | null
          id: string
          order: number
          product_id: string
          size_mb: number | null
          type: string
          url: string
          width: number | null
        }
        Insert: {
          format?: string | null
          height?: number | null
          id?: string
          order?: number
          product_id: string
          size_mb?: number | null
          type: string
          url: string
          width?: number | null
        }
        Update: {
          format?: string | null
          height?: number | null
          id?: string
          order?: number
          product_id?: string
          size_mb?: number | null
          type?: string
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string | null
          description: string
          id: string
          name: string
          price: number
          product_code: string
          short_description: string | null
          status: string
          summary: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string
          id?: string
          name: string
          price: number
          product_code: string
          short_description?: string | null
          status?: string
          summary: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          name?: string
          price?: number
          product_code?: string
          short_description?: string | null
          status?: string
          summary?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          name?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      stock_histories: {
        Row: {
          created_at: string | null
          product_id: string
          quantity: number
          reason: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          product_id: string
          quantity: number
          reason?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          product_id?: string
          quantity?: number
          reason?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_histories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_histories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      stocks: {
        Row: {
          product_id: string
          sold: number
          total: number
        }
        Insert: {
          product_id: string
          sold?: number
          total?: number
        }
        Update: {
          product_id?: string
          sold?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "stocks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stocks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products_with_stock"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      products_with_stock: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          name: string | null
          price: number | null
          product_code: string | null
          short_description: string | null
          status: string | null
          stock_available: number | null
          stock_sold: number | null
          stock_total: number | null
          summary: string | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_products: {
        Args: { product_ids: string[] }
        Returns: void
      }
      adjust_product_stock: {
        Args: {
          p_product_id: string
          p_type:       string
          p_quantity:   number
          p_reason?:    string | null
        }
        Returns: Json
      }
      update_order_status_with_history: {
        Args: {
          p_order_id: string
          p_order_status?: string | null
          p_payment_status?: string | null
          p_shipping_status?: string | null
          p_actor_type?: string | null
          p_actor_name?: string | null
          p_reason?: string | null
        }
        Returns: Database["public"]["Tables"]["orders"]["Row"]
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
