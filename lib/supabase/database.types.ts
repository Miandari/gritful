export type Database = {
  public: {
    Tables: {
      challenges: {
        Row: {
          id: string
          name: string
          description: string | null
          starts_at: string
          ends_at: string
          duration_days: number
          created_at: string
          updated_at: string
          creator_id: string
          is_public: boolean
          metrics: any
          failure_mode: string
          lock_entries_after_day: boolean
          invite_code: string | null
          cover_image_url: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          starts_at: string
          ends_at: string
          duration_days: number
          created_at?: string
          updated_at?: string
          creator_id: string
          is_public?: boolean
          metrics?: any
          failure_mode?: string
          lock_entries_after_day?: boolean
          invite_code?: string | null
          cover_image_url?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          starts_at?: string
          ends_at?: string
          duration_days?: number
          created_at?: string
          updated_at?: string
          creator_id?: string
          is_public?: boolean
          metrics?: any
          failure_mode?: string
          lock_entries_after_day?: boolean
          invite_code?: string | null
          cover_image_url?: string | null
        }
      }
      challenge_participants: {
        Row: {
          id: string
          challenge_id: string
          user_id: string
          joined_at: string
          status: string
          current_streak: number
          longest_streak: number
        }
        Insert: {
          id?: string
          challenge_id: string
          user_id: string
          joined_at?: string
          status?: string
          current_streak?: number
          longest_streak?: number
        }
        Update: {
          id?: string
          challenge_id?: string
          user_id?: string
          joined_at?: string
          status?: string
          current_streak?: number
          longest_streak?: number
        }
      }
      daily_entries: {
        Row: {
          id: string
          participant_id: string
          entry_date: string
          metric_data: any
          is_completed: boolean
          is_locked: boolean
          notes: string | null
          submitted_at: string | null
          created_at: string
          updated_at: string
          file_urls: string[] | null
          day_number?: number
          values?: any
        }
        Insert: {
          id?: string
          participant_id: string
          entry_date?: string
          metric_data?: any
          is_completed?: boolean
          is_locked?: boolean
          notes?: string | null
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
          file_urls?: string[] | null
          day_number?: number
          values?: any
        }
        Update: {
          id?: string
          participant_id?: string
          entry_date?: string
          metric_data?: any
          is_completed?: boolean
          is_locked?: boolean
          notes?: string | null
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
          file_urls?: string[] | null
          day_number?: number
          values?: any
        }
      }
      email_queue: {
        Row: {
          id: string
          user_id: string | null
          email_type: string
          recipient_email: string
          subject: string
          template_name: string
          template_data: any
          status: string
          retry_count: number
          max_retries: number
          scheduled_for: string
          sent_at: string | null
          failed_at: string | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          email_type: string
          recipient_email: string
          subject: string
          template_name: string
          template_data?: any
          status?: string
          retry_count?: number
          max_retries?: number
          scheduled_for?: string
          sent_at?: string | null
          failed_at?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          email_type?: string
          recipient_email?: string
          subject?: string
          template_name?: string
          template_data?: any
          status?: string
          retry_count?: number
          max_retries?: number
          scheduled_for?: string
          sent_at?: string | null
          failed_at?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      email_unsubscribe_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          email_type: string | null
          challenge_id: string | null
          used_at: string | null
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token: string
          email_type?: string | null
          challenge_id?: string | null
          used_at?: string | null
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          email_type?: string | null
          challenge_id?: string | null
          used_at?: string | null
          created_at?: string
          expires_at?: string
        }
      }
      challenge_invite_links: {
        Row: {
          id: string
          challenge_id: string
          token: string
          auto_admit: boolean
          expires_at: string | null
          max_uses: number | null
          use_count: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          challenge_id: string
          token: string
          auto_admit?: boolean
          expires_at?: string | null
          max_uses?: number | null
          use_count?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          challenge_id?: string
          token?: string
          auto_admit?: boolean
          expires_at?: string | null
          max_uses?: number | null
          use_count?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      invite_link_uses: {
        Row: {
          id: string
          invite_link_id: string
          user_id: string
          used_at: string
          result: string
        }
        Insert: {
          id?: string
          invite_link_id: string
          user_id: string
          used_at?: string
          result: string
        }
        Update: {
          id?: string
          invite_link_id?: string
          user_id?: string
          used_at?: string
          result?: string
        }
      }
      profiles: {
        Row: {
          id: string
          username: string | null
          avatar_url: string | null
          full_name: string | null
          bio: string | null
          website_url: string | null
          twitter_handle: string | null
          github_handle: string | null
          instagram_handle: string | null
          location: string | null
          public_profile_url: string | null
          last_active_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          avatar_url?: string | null
          full_name?: string | null
          bio?: string | null
          website_url?: string | null
          twitter_handle?: string | null
          github_handle?: string | null
          instagram_handle?: string | null
          location?: string | null
          public_profile_url?: string | null
          last_active_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          avatar_url?: string | null
          full_name?: string | null
          bio?: string | null
          website_url?: string | null
          twitter_handle?: string | null
          github_handle?: string | null
          instagram_handle?: string | null
          location?: string | null
          public_profile_url?: string | null
          last_active_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_challenge_access: {
        Row: {
          user_id: string
          challenge_id: string
          can_view: boolean
          can_edit: boolean
          access_reason: string | null
        }
        Insert: {
          user_id: string
          challenge_id: string
          can_view?: boolean
          can_edit?: boolean
          access_reason?: string | null
        }
        Update: {
          user_id?: string
          challenge_id?: string
          can_view?: boolean
          can_edit?: boolean
          access_reason?: string | null
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          email_notifications_enabled: boolean
          email_daily_reminder: boolean
          email_challenge_updates: boolean
          email_join_requests: boolean
          email_weekly_summary: boolean
          app_notifications_enabled: boolean
          profile_visibility: string
          show_email: boolean
          theme: string
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email_notifications_enabled?: boolean
          email_daily_reminder?: boolean
          email_challenge_updates?: boolean
          email_join_requests?: boolean
          email_weekly_summary?: boolean
          app_notifications_enabled?: boolean
          profile_visibility?: string
          show_email?: boolean
          theme?: string
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email_notifications_enabled?: boolean
          email_daily_reminder?: boolean
          email_challenge_updates?: boolean
          email_join_requests?: boolean
          email_weekly_summary?: boolean
          app_notifications_enabled?: boolean
          profile_visibility?: string
          show_email?: boolean
          theme?: string
          timezone?: string
          created_at?: string
          updated_at?: string
        }
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