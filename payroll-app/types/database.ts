export type UserRole = 'owner' | 'hr' | 'accountant' | 'employee'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: UserRole
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: UserRole
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: UserRole
          updated_at?: string
        }
        Relationships: []
      }
      employee_groups: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          id: string
          profile_id: string | null
          employee_number: string
          full_name: string
          email: string
          position: string | null
          department: string | null
          group_id: string | null
          salary: number | null
          is_sensitive: boolean
          status: 'active' | 'inactive' | 'on_leave'
          hire_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id?: string | null
          employee_number: string
          full_name: string
          email: string
          position?: string | null
          department?: string | null
          group_id?: string | null
          salary?: number | null
          is_sensitive?: boolean
          status?: 'active' | 'inactive' | 'on_leave'
          hire_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string | null
          employee_number?: string
          full_name?: string
          email?: string
          position?: string | null
          department?: string | null
          group_id?: string | null
          salary?: number | null
          is_sensitive?: boolean
          status?: 'active' | 'inactive' | 'on_leave'
          hire_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
      role_permissions: {
        Row: {
          feature: string
          role: UserRole
          enabled: boolean
        }
        Insert: {
          feature: string
          role: UserRole
          enabled: boolean
        }
        Update: {
          feature?: string
          role?: UserRole
          enabled?: boolean
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Employee = Database['public']['Tables']['employees']['Row']
export type EmployeeGroup = Database['public']['Tables']['employee_groups']['Row']
export type EmployeeStatus = Employee['status']
export type RolePermission = Database['public']['Tables']['role_permissions']['Row']
