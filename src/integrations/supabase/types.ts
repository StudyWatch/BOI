export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      default_requirements: {
        Row: {
          active: boolean | null
          day_type: string
          id: string
          required_roles: Json
          shift_type: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          day_type: string
          id?: string
          required_roles: Json
          shift_type: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          day_type?: string
          id?: string
          required_roles?: Json
          shift_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      employee_daily_preferences: {
        Row: {
          afternoon_choice: string
          created_at: string | null
          date: string
          day_note: string | null
          employee_id: string | null
          id: string
          is_military: boolean
          morning_choice: string
          night_choice: string
          updated_at: string | null
        }
        Insert: {
          afternoon_choice: string
          created_at?: string | null
          date: string
          day_note?: string | null
          employee_id?: string | null
          id?: string
          is_military?: boolean
          morning_choice: string
          night_choice: string
          updated_at?: string | null
        }
        Update: {
          afternoon_choice?: string
          created_at?: string | null
          date?: string
          day_note?: string | null
          employee_id?: string | null
          id?: string
          is_military?: boolean
          morning_choice?: string
          night_choice?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_daily_preferences_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_notes: {
        Row: {
          content: string
          created_at: string
          date: string
          employee_id: string | null
          id: string
          note_type: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          date: string
          employee_id?: string | null
          id?: string
          note_type: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          date?: string
          employee_id?: string | null
          id?: string
          note_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_notes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean
          code: string
          created_at: string
          funny_title: string | null
          id: string
          name: string
          preferences: Json | null
          role: string
          updated_at: string
          userpreferences: Json | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          funny_title?: string | null
          id?: string
          name: string
          preferences?: Json | null
          role: string
          updated_at?: string
          userpreferences?: Json | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          funny_title?: string | null
          id?: string
          name?: string
          preferences?: Json | null
          role?: string
          updated_at?: string
          userpreferences?: Json | null
        }
        Relationships: []
      }
      schedule_rules: {
        Row: {
          active: boolean
          created_at: string
          id: string
          rule_name: string
          rule_value: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          rule_name: string
          rule_value?: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          rule_name?: string
          rule_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      shift_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          created_at: string
          date: string
          employee_id: string
          id: string
          notes: string | null
          role: string
          shift_type: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string
          created_at?: string
          date: string
          employee_id: string
          id?: string
          notes?: string | null
          role: string
          shift_type: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          notes?: string | null
          role?: string
          shift_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_preferences: {
        Row: {
          created_at: string
          day_part: string
          employee_id: string | null
          id: string
          preference: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_part: string
          employee_id?: string | null
          id?: string
          preference: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_part?: string
          employee_id?: string | null
          id?: string
          preference?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_preferences_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_swap_requests: {
        Row: {
          created_at: string
          from_employee_id: string
          from_shift_date: string
          from_shift_type: string
          id: string
          notes: string | null
          reviewed_at: string | null
          status: string
          to_employee_id: string
          to_shift_date: string
          to_shift_type: string
        }
        Insert: {
          created_at?: string
          from_employee_id: string
          from_shift_date: string
          from_shift_type: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          status?: string
          to_employee_id: string
          to_shift_date: string
          to_shift_type: string
        }
        Update: {
          created_at?: string
          from_employee_id?: string
          from_shift_date?: string
          from_shift_type?: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          status?: string
          to_employee_id?: string
          to_shift_date?: string
          to_shift_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_swap_requests_from_employee_id_fkey"
            columns: ["from_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_swap_requests_to_employee_id_fkey"
            columns: ["to_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_at: string
          date: string
          employee_id: string | null
          id: string
          shift_type: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          employee_id?: string | null
          id?: string
          shift_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          employee_id?: string | null
          id?: string
          shift_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
