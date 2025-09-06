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
      users: {
        Row: {
          id: string
          email: string
          name: string
          avatar_url: string | null
          provider: string
          provider_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          avatar_url?: string | null
          provider: string
          provider_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          avatar_url?: string | null
          provider?: string
          provider_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          id: string
          creator_id: string
          original_filename: string | null
          duration: number
          file_size: number
          cloudinary_public_id: string | null
          streaming_url: string | null
          thumbnail_url: string | null
          processing_status: string
          moderation_status: string
          moderation_result: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          original_filename?: string | null
          duration: number
          file_size: number
          cloudinary_public_id?: string | null
          streaming_url?: string | null
          thumbnail_url?: string | null
          processing_status?: string
          moderation_status?: string
          moderation_result?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          original_filename?: string | null
          duration?: number
          file_size?: number
          cloudinary_public_id?: string | null
          streaming_url?: string | null
          thumbnail_url?: string | null
          processing_status?: string
          moderation_status?: string
          moderation_result?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      stories: {
        Row: {
          id: string
          creator_id: string
          title: string
          description: string | null
          story_data: Json
          is_published: boolean
          thumbnail_url: string | null
          view_count: number
          created_at: string
          updated_at: string
          published_at: string | null
        }
        Insert: {
          id?: string
          creator_id: string
          title: string
          description?: string | null
          story_data: Json
          is_published?: boolean
          thumbnail_url?: string | null
          view_count?: number
          created_at?: string
          updated_at?: string
          published_at?: string | null
        }
        Update: {
          id?: string
          creator_id?: string
          title?: string
          description?: string | null
          story_data?: Json
          is_published?: boolean
          thumbnail_url?: string | null
          view_count?: number
          created_at?: string
          updated_at?: string
          published_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stories_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      story_playthroughs: {
        Row: {
          id: string
          story_id: string
          viewer_id: string | null
          path_taken: Json
          completed_at: string | null
          session_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          story_id: string
          viewer_id?: string | null
          path_taken: Json
          completed_at?: string | null
          session_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          story_id?: string
          viewer_id?: string | null
          path_taken?: Json
          completed_at?: string | null
          session_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_playthroughs_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_playthroughs_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      content_flags: {
        Row: {
          id: string
          content_type: string
          content_id: string
          reporter_id: string | null
          reason: string
          status: string
          admin_notes: string | null
          created_at: string
          reviewed_at: string | null
        }
        Insert: {
          id?: string
          content_type: string
          content_id: string
          reporter_id?: string | null
          reason: string
          status?: string
          admin_notes?: string | null
          created_at?: string
          reviewed_at?: string | null
        }
        Update: {
          id?: string
          content_type?: string
          content_id?: string
          reporter_id?: string | null
          reason?: string
          status?: string
          admin_notes?: string | null
          created_at?: string
          reviewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_flags_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_feed_page: {
        Args: {
          page_size: number
          cursor_timestamp?: string | null
          feed_type?: string
        }
        Returns: {
          story_id: string
          creator_id: string
          creator_name: string
          creator_avatar: string | null
          title: string
          description: string | null
          thumbnail_url: string | null
          view_count: number
          published_at: string
          engagement_score?: number
        }[]
      }
      get_creator_feed: {
        Args: {
          target_creator_id: string
          page_size: number
          cursor_timestamp?: string | null
        }
        Returns: {
          story_id: string
          creator_id: string
          creator_name: string
          creator_avatar: string | null
          title: string
          description: string | null
          thumbnail_url: string | null
          view_count: number
          published_at: string
          engagement_score?: number
        }[]
      }
      refresh_feed_cache: {
        Args: Record<PropertyKey, never>
        Returns: void
      }
      increment_story_view_count: {
        Args: {
          story_uuid: string
        }
        Returns: void
      }
      increment_story_views: {
        Args: {
          story_uuid: string
        }
        Returns: void
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