export type UserRole = 'owner' | 'hr' | 'accountant' | 'employee'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: string          // text in DB — supports custom roles
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: string
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
          birth_date: string | null
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
          birth_date?: string | null
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
          birth_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          id: string
          name: string
          is_default: boolean
          created_at: string
        }
        Insert: {
          id: string
          name: string
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          is_default?: boolean
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          feature: string
          role: string            // text in DB — supports custom roles
          enabled: boolean
        }
        Insert: {
          feature: string
          role: string
          enabled: boolean
        }
        Update: {
          feature?: string
          role?: string
          enabled?: boolean
        }
        Relationships: []
      }
      employee_payment_methods: {
        Row: {
          id: string
          employee_id: string
          method_type: 'deel' | 'ccb' | 'non_ccb' | 'hsbc' | 'other'
          percentage: number
          // Deel
          deel_worker_id: string | null
          // CCB
          chinese_name: string | null
          // Shared bank fields
          beneficiary_name: string | null
          account_number: string | null
          branch: string | null
          swift_code: string | null
          bank_name: string | null
          // HSBC
          bank_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          method_type: 'deel' | 'ccb' | 'non_ccb' | 'hsbc' | 'other'
          percentage: number
          deel_worker_id?: string | null
          chinese_name?: string | null
          beneficiary_name?: string | null
          account_number?: string | null
          branch?: string | null
          swift_code?: string | null
          bank_name?: string | null
          bank_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          method_type?: 'deel' | 'ccb' | 'non_ccb' | 'hsbc' | 'other'
          percentage?: number
          deel_worker_id?: string | null
          chinese_name?: string | null
          beneficiary_name?: string | null
          account_number?: string | null
          branch?: string | null
          swift_code?: string | null
          bank_name?: string | null
          bank_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          id: string
          name: string
          type: 'builtin' | 'custom'
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type?: 'builtin' | 'custom'
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'builtin' | 'custom'
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          id: number
          ccb_account_number: string | null
          hsbc_hk_account_number: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          ccb_account_number?: string | null
          hsbc_hk_account_number?: string | null
          updated_at?: string
        }
        Update: {
          ccb_account_number?: string | null
          hsbc_hk_account_number?: string | null
          updated_at?: string
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

export type PaymentMethodType = 'deel' | 'ccb' | 'non_ccb' | 'hsbc' | 'other'

export interface PaymentMethodInput {
  method_type: PaymentMethodType
  percentage: number
  deel_worker_id?: string | null
  chinese_name?: string | null
  beneficiary_name?: string | null
  account_number?: string | null
  branch?: string | null
  swift_code?: string | null
  bank_name?: string | null
  bank_code?: string | null
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Employee = Database['public']['Tables']['employees']['Row']
export type EmployeeGroup = Database['public']['Tables']['employee_groups']['Row']
export type EmployeeStatus = Employee['status']
export type Role = Database['public']['Tables']['roles']['Row']
export type RolePermission = Database['public']['Tables']['role_permissions']['Row']
export type EmployeePaymentMethod = Database['public']['Tables']['employee_payment_methods']['Row']
export type CompanySettings = Database['public']['Tables']['company_settings']['Row']
export type Department = Database['public']['Tables']['departments']['Row']
