export type CowStatus =
  | 'estrus_pending'
  | 'inseminated'
  | 'pregnancy_check_pending'
  | 'calving_pending'
  | 'idle'

export type Database = {
  public: {
    Tables: {
      cows: {
        Row: {
          id: string
          user_id: string
          ear_tag: string
          birth_date: string | null
          father_name: string | null
          mother_name: string | null
          current_status: CowStatus
          next_action_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ear_tag: string
          birth_date?: string | null
          father_name?: string | null
          mother_name?: string | null
          current_status?: CowStatus
          next_action_date?: string | null
          created_at?: string
        }
        Update: {
          ear_tag?: string
          birth_date?: string | null
          father_name?: string | null
          mother_name?: string | null
          current_status?: CowStatus
          next_action_date?: string | null
        }
      }
      breeding_cycles: {
        Row: {
          id: string
          cow_id: string
          user_id: string
          cycle_number: number
          created_at: string
        }
        Insert: {
          id?: string
          cow_id: string
          user_id: string
          cycle_number: number
          created_at?: string
        }
        Update: Record<string, never>
      }
      insemination_records: {
        Row: {
          id: string
          cycle_id: string
          user_id: string
          insemination_date: string
          semen_name: string | null
          attempt_number: number
          created_at: string
        }
        Insert: {
          id?: string
          cycle_id: string
          user_id: string
          insemination_date: string
          semen_name?: string | null
          attempt_number?: number
          created_at?: string
        }
        Update: {
          insemination_date?: string
          semen_name?: string | null
        }
      }
      breeding_events: {
        Row: {
          id: string
          cycle_id: string
          cow_id: string
          user_id: string
          estrus_date: string | null
          pregnancy_check_date: string | null
          pregnancy_result: boolean | null
          expected_calving_date: string | null
          actual_calving_date: string | null
          calf_gender: string | null
          calf_weight: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cycle_id: string
          cow_id: string
          user_id: string
          estrus_date?: string | null
          pregnancy_check_date?: string | null
          pregnancy_result?: boolean | null
          expected_calving_date?: string | null
          actual_calving_date?: string | null
          calf_gender?: string | null
          calf_weight?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          estrus_date?: string | null
          pregnancy_check_date?: string | null
          pregnancy_result?: boolean | null
          expected_calving_date?: string | null
          actual_calving_date?: string | null
          calf_gender?: string | null
          calf_weight?: number | null
          updated_at?: string
        }
      }
      notification_settings: {
        Row: {
          id: string
          user_id: string
          email: string
          notify_7days: boolean
          notify_3days: boolean
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          notify_7days?: boolean
          notify_3days?: boolean
        }
        Update: {
          email?: string
          notify_7days?: boolean
          notify_3days?: boolean
        }
      }
      notification_logs: {
        Row: {
          id: string
          user_id: string
          cow_id: string
          notification_type: string
          scheduled_date: string
          sent_at: string
        }
        Insert: {
          id?: string
          user_id: string
          cow_id: string
          notification_type: string
          scheduled_date: string
          sent_at?: string
        }
        Update: Record<string, never>
      }
    }
  }
}
