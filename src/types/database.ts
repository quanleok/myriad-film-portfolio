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
      comments: {
        Row: {
          body: string
          created_at: string
          id: string
          is_pinned: boolean
          like_count: number
          parent_id: string | null
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          like_count?: number
          parent_id?: string | null
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          like_count?: number
          parent_id?: string | null
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "trending_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          created_at: string
          description_json: Json
          id: string
          name: string
          ref_image_url: string | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description_json?: Json
          id?: string
          name: string
          ref_image_url?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description_json?: Json
          id?: string
          name?: string
          ref_image_url?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "characters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      character_outputs: {
        Row: {
          character_id: string
          created_at: string
          id: string
          image_url: string | null
          is_pinned: boolean
          metadata_json: Json
          type: string
          user_id: string
        }
        Insert: {
          character_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          metadata_json?: Json
          type: string
          user_id: string
        }
        Update: {
          character_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          metadata_json?: Json
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_outputs_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_outputs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          id: string
          reporter_id: string
          video_id: string | null
          comment_id: string | null
          reason: string
          details: string | null
          status: string
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          video_id?: string | null
          comment_id?: string | null
          reason: string
          details?: string | null
          status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string
          video_id?: string | null
          comment_id?: string | null
          reason?: string
          details?: string | null
          status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_creators: {
        Row: {
          id: string
          user_id: string
          creator_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          creator_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          creator_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_creators_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      founding_applications: {
        Row: {
          id: string
          user_id: string | null
          email: string
          display_name: string
          invite_code: string | null
          portfolio_link: string | null
          ai_tools: string[]
          status: string
          created_at: string
          reviewed_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          email: string
          display_name: string
          invite_code?: string | null
          portfolio_link?: string | null
          ai_tools?: string[]
          status?: string
          created_at?: string
          reviewed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          email?: string
          display_name?: string
          invite_code?: string | null
          portfolio_link?: string | null
          ai_tools?: string[]
          status?: string
          created_at?: string
          reviewed_at?: string | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string | null
          creator_id: string
          follower_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          follower_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          follower_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          id: string
          code: string
          created_by: string | null
          used_by: string | null
          max_uses: number
          use_count: number
          expires_at: string | null
          is_active: boolean
          program: string
          created_at: string
          used_at: string | null
        }
        Insert: {
          id?: string
          code: string
          created_by?: string | null
          used_by?: string | null
          max_uses?: number
          use_count?: number
          expires_at?: string | null
          is_active?: boolean
          program?: string
          created_at?: string
          used_at?: string | null
        }
        Update: {
          id?: string
          code?: string
          created_by?: string | null
          used_by?: string | null
          max_uses?: number
          use_count?: number
          expires_at?: string | null
          is_active?: boolean
          program?: string
          created_at?: string
          used_at?: string | null
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "trending_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_dislikes: {
        Row: {
          id: string
          user_id: string
          video_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          video_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          video_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_dislikes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_dislikes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "trending_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_dislikes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      premiere_chats: {
        Row: {
          id: string
          video_id: string
          user_id: string
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          video_id: string
          user_id: string
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          video_id?: string
          user_id?: string
          message?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "premiere_chats_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premiere_chats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          cover_image_url: string | null
          is_public: boolean
          video_count: number
          total_duration_seconds: number
          price_cents: number | null
          is_premium: boolean
          creator_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          cover_image_url?: string | null
          is_public?: boolean
          video_count?: number
          total_duration_seconds?: number
          price_cents?: number | null
          is_premium?: boolean
          creator_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          cover_image_url?: string | null
          is_public?: boolean
          video_count?: number
          total_duration_seconds?: number
          price_cents?: number | null
          is_premium?: boolean
          creator_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bundles: {
        Row: {
          id: string
          creator_id: string
          title: string
          description: string | null
          thumbnail_url: string | null
          price_cents: number | null
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          title: string
          description?: string | null
          thumbnail_url?: string | null
          price_cents?: number | null
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          title?: string
          description?: string | null
          thumbnail_url?: string | null
          price_cents?: number | null
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundles_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bundle_items: {
        Row: {
          id: string
          bundle_id: string
          video_id: string
          position: number
        }
        Insert: {
          id?: string
          bundle_id: string
          video_id: string
          position?: number
        }
        Update: {
          id?: string
          bundle_id?: string
          video_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_items_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      bundle_purchases: {
        Row: {
          id: string
          viewer_id: string
          bundle_id: string
          creator_id: string
          amount_cents: number
          platform_fee_cents: number
          creator_earnings_cents: number
          stripe_payment_intent_id: string
          payment_status: string
          created_at: string
        }
        Insert: {
          id?: string
          viewer_id: string
          bundle_id: string
          creator_id: string
          amount_cents?: number
          platform_fee_cents?: number
          creator_earnings_cents?: number
          stripe_payment_intent_id?: string
          payment_status?: string
          created_at?: string
        }
        Update: {
          id?: string
          viewer_id?: string
          bundle_id?: string
          creator_id?: string
          amount_cents?: number
          platform_fee_cents?: number
          creator_earnings_cents?: number
          stripe_payment_intent_id?: string
          payment_status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_purchases_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_purchases_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_purchases_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_items: {
        Row: {
          id: string
          playlist_id: string
          video_id: string
          position: number
          added_at: string
        }
        Insert: {
          id?: string
          playlist_id: string
          video_id: string
          position?: number
          added_at?: string
        }
        Update: {
          id?: string
          playlist_id?: string
          video_id?: string
          position?: number
          added_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_items_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount_cents: number
          created_at: string
          creator_id: string
          id: string
          payout_status: Database["public"]["Enums"]["payout_status"]
          period_end: string
          period_start: string
          stripe_transfer_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          creator_id: string
          id?: string
          payout_status?: Database["public"]["Enums"]["payout_status"]
          period_end: string
          period_start: string
          stripe_transfer_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          creator_id?: string
          id?: string
          payout_status?: Database["public"]["Enums"]["payout_status"]
          period_end?: string
          period_start?: string
          stripe_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          balance_cents: number
          banner_url: string | null
          bio: string | null
          created_at: string
          creator_onboarding_completed: boolean
          display_name: string
          follower_count: number
          genre_interests: string[]
          hire_availability: string | null
          hire_price_band: string | null
          hire_specialties: string[]
          id: string
          is_admin: boolean
          is_banned: boolean
          is_creator: boolean
          is_founding_creator: boolean
          founding_creator_approved_at: string | null
          is_dispute_flagged: boolean
          dispute_count: number
          account_frozen: boolean
          last_active_at: string | null
          phone_verified: boolean
          role: Database["public"]["Enums"]["user_role"]
          social_links: Json | null
          star_level: number
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean | null
          subscriber_count: number
          subscription_price_cents: number | null
          subscription_stripe_price_id: string | null
          total_earnings_cents: number
          total_revenue_earned: number
          total_views: number
          updated_at: string
          username: string
          website_url: string | null
          xp_points: number
        }
        Insert: {
          avatar_url?: string | null
          balance_cents?: number
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          creator_onboarding_completed?: boolean
          display_name: string
          follower_count?: number
          genre_interests?: string[]
          hire_availability?: string | null
          hire_price_band?: string | null
          hire_specialties?: string[]
          id: string
          is_admin?: boolean
          is_banned?: boolean
          is_creator?: boolean
          is_founding_creator?: boolean
          founding_creator_approved_at?: string | null
          is_dispute_flagged?: boolean
          dispute_count?: number
          account_frozen?: boolean
          last_active_at?: string | null
          phone_verified?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          social_links?: Json | null
          star_level?: number
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          subscriber_count?: number
          subscription_price_cents?: number | null
          subscription_stripe_price_id?: string | null
          total_earnings_cents?: number
          total_revenue_earned?: number
          total_views?: number
          updated_at?: string
          username: string
          website_url?: string | null
          xp_points?: number
        }
        Update: {
          avatar_url?: string | null
          balance_cents?: number
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          creator_onboarding_completed?: boolean
          display_name?: string
          follower_count?: number
          genre_interests?: string[]
          hire_availability?: string | null
          hire_price_band?: string | null
          hire_specialties?: string[]
          id?: string
          is_admin?: boolean
          is_banned?: boolean
          is_creator?: boolean
          is_founding_creator?: boolean
          founding_creator_approved_at?: string | null
          is_dispute_flagged?: boolean
          dispute_count?: number
          account_frozen?: boolean
          last_active_at?: string | null
          phone_verified?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          social_links?: Json | null
          star_level?: number
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          subscriber_count?: number
          subscription_price_cents?: number | null
          subscription_stripe_price_id?: string | null
          total_earnings_cents?: number
          total_revenue_earned?: number
          total_views?: number
          updated_at?: string
          username?: string
          website_url?: string | null
          xp_points?: number
        }
        Relationships: []
      }
      xp_events: {
        Row: {
          id: string
          user_id: string
          event_type: string
          xp_amount: number
          reference_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          xp_amount: number
          reference_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: string
          xp_amount?: number
          reference_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "xp_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          amount_cents: number
          created_at: string
          creator_earnings_cents: number
          creator_id: string
          id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          platform_fee_cents: number
          stripe_payment_intent_id: string
          video_id: string
          viewer_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          creator_earnings_cents: number
          creator_id: string
          id?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          platform_fee_cents: number
          stripe_payment_intent_id: string
          video_id: string
          viewer_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          creator_earnings_cents?: number
          creator_id?: string
          id?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          platform_fee_cents?: number
          stripe_payment_intent_id?: string
          video_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "trending_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "trending_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      series: {
        Row: {
          cover_image_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          episode_count: number
          genre: Database["public"]["Enums"]["genre"]
          id: string
          is_published: boolean
          pricing_model: string
          season_count: number
          series_type: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          total_views: number
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          episode_count?: number
          genre: Database["public"]["Enums"]["genre"]
          id?: string
          is_published?: boolean
          pricing_model?: string
          season_count?: number
          series_type?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          total_views?: number
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          episode_count?: number
          genre?: Database["public"]["Enums"]["genre"]
          id?: string
          is_published?: boolean
          pricing_model?: string
          season_count?: number
          series_type?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          total_views?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "series_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_episodes: {
        Row: {
          id: string
          project_id: string
          episode_number: number
          title: string
          video_id: string | null
          premiere_scheduled_at: string | null
          premiere_ended: boolean
          is_premiere_live: boolean
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          episode_number: number
          title?: string
          video_id?: string | null
          premiere_scheduled_at?: string | null
          premiere_ended?: boolean
          is_premiere_live?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          episode_number?: number
          title?: string
          video_id?: string | null
          premiere_scheduled_at?: string | null
          premiere_ended?: boolean
          is_premiere_live?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_episodes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_episodes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          canceled_at: string | null
          created_at: string
          creator_earnings_cents: number
          creator_id: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          is_active: boolean
          platform_fee_cents: number
          price_cents: number
          stripe_customer_id: string
          stripe_subscription_id: string
          subscriber_id: string
          updated_at: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          creator_earnings_cents: number
          creator_id: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_active?: boolean
          platform_fee_cents: number
          price_cents: number
          stripe_customer_id: string
          stripe_subscription_id: string
          subscriber_id: string
          updated_at?: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          creator_earnings_cents?: number
          creator_id?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_active?: boolean
          platform_fee_cents?: number
          price_cents?: number
          stripe_customer_id?: string
          stripe_subscription_id?: string
          subscriber_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tips: {
        Row: {
          id: string
          tipper_id: string
          creator_id: string
          video_id: string | null
          amount_cents: number
          platform_fee_cents: number
          creator_earnings_cents: number
          stripe_payment_intent_id: string
          created_at: string
        }
        Insert: {
          id?: string
          tipper_id: string
          creator_id: string
          video_id?: string | null
          amount_cents: number
          platform_fee_cents: number
          creator_earnings_cents: number
          stripe_payment_intent_id: string
          created_at?: string
        }
        Update: {
          id?: string
          tipper_id?: string
          creator_id?: string
          video_id?: string | null
          amount_cents?: number
          platform_fee_cents?: number
          creator_earnings_cents?: number
          stripe_payment_intent_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tips_tipper_id_fkey"
            columns: ["tipper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorial_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          like_count: number
          parent_id: string | null
          tutorial_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          like_count?: number
          parent_id?: string | null
          tutorial_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          like_count?: number
          parent_id?: string | null
          tutorial_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutorial_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tutorial_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutorial_comments_tutorial_id_fkey"
            columns: ["tutorial_id"]
            isOneToOne: false
            referencedRelation: "tutorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutorial_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorial_likes: {
        Row: {
          created_at: string
          id: string
          tutorial_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tutorial_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tutorial_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutorial_likes_tutorial_id_fkey"
            columns: ["tutorial_id"]
            isOneToOne: false
            referencedRelation: "tutorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutorial_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorials: {
        Row: {
          body_markdown: string
          category: string
          comment_count: number
          cover_image_url: string | null
          created_at: string
          difficulty: string
          id: string
          is_featured: boolean
          is_published: boolean
          like_count: number
          slug: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
          view_count: number
        }
        Insert: {
          body_markdown: string
          category?: string
          comment_count?: number
          cover_image_url?: string | null
          created_at?: string
          difficulty?: string
          id?: string
          is_featured?: boolean
          is_published?: boolean
          like_count?: number
          slug: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
          view_count?: number
        }
        Update: {
          body_markdown?: string
          category?: string
          comment_count?: number
          cover_image_url?: string | null
          created_at?: string
          difficulty?: string
          id?: string
          is_featured?: boolean
          is_published?: boolean
          like_count?: number
          slug?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "tutorials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_views: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          ip_hash: string | null
          video_id: string
          viewer_id: string | null
          watch_duration_seconds: number
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          ip_hash?: string | null
          video_id: string
          viewer_id?: string | null
          watch_duration_seconds?: number
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          ip_hash?: string | null
          video_id?: string
          viewer_id?: string | null
          watch_duration_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_views_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "trending_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_views_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          avg_rating: number | null
          bunny_library_id: string | null
          bunny_video_id: string | null
          comment_count: number
          content_rating: string | null
          content_type: Database["public"]["Enums"]["content_type"]
          ai_tool: string | null
          created_at: string
          creator_id: string
          description: string | null
          dislike_count: number
          duration_seconds: number | null
          episode_number: number | null
          genre: Database["public"]["Enums"]["genre"]
          id: string
          is_editors_pick: boolean
          is_featured: boolean
          is_premium: boolean
          is_premiere: boolean
          is_premiere_live: boolean
          is_processed: boolean
          is_published: boolean
          is_trending: boolean
          like_count: number
          premiere_at: string | null
          premiere_ended: boolean
          premiere_scheduled_at: string | null
          preview_duration_seconds: number | null
          preview_seconds: number | null
          preview_type: string | null
          preview_video_id: string | null
          price_cents: number | null
          pricing_model: Database["public"]["Enums"]["pricing_model"]
          project_id: string | null
          published_at: string | null
          purchase_count: number
          rating_count: number
          season_number: number | null
          series_id: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
          view_count: number
          visibility: string
          youtube_url: string | null
          media_type: string
          album_art_url: string | null
          mood_tags: string[]
          lesson_notes: string | null
          lesson_resources: Json
          trending_score: number
          net_score: number
          share_count: number
          story_elements: Json | null
          deleted_at: string | null
        }
        Insert: {
          ai_tool?: string | null
          avg_rating?: number | null
          bunny_library_id?: string | null
          bunny_video_id?: string | null
          comment_count?: number
          content_rating?: string | null
          content_type: Database["public"]["Enums"]["content_type"]
          created_at?: string
          creator_id: string
          deleted_at?: string | null
          description?: string | null
          dislike_count?: number
          duration_seconds?: number | null
          episode_number?: number | null
          genre: Database["public"]["Enums"]["genre"]
          id?: string
          is_editors_pick?: boolean
          is_featured?: boolean
          is_premium?: boolean
          is_premiere?: boolean
          is_premiere_live?: boolean
          is_processed?: boolean
          is_published?: boolean
          is_trending?: boolean
          like_count?: number
          premiere_at?: string | null
          premiere_ended?: boolean
          premiere_scheduled_at?: string | null
          preview_duration_seconds?: number | null
          preview_seconds?: number | null
          preview_type?: string | null
          preview_video_id?: string | null
          price_cents?: number | null
          pricing_model?: Database["public"]["Enums"]["pricing_model"]
          project_id?: string | null
          published_at?: string | null
          purchase_count?: number
          rating_count?: number
          season_number?: number | null
          series_id?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
          view_count?: number
          visibility?: string
          youtube_url?: string | null
          media_type?: string
          album_art_url?: string | null
          mood_tags?: string[]
          lesson_notes?: string | null
          lesson_resources?: Json
          trending_score?: number
          net_score?: number
          share_count?: number
          story_elements?: Json | null
        }
        Update: {
          ai_tool?: string | null
          avg_rating?: number | null
          bunny_library_id?: string | null
          bunny_video_id?: string | null
          comment_count?: number
          content_rating?: string | null
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string
          creator_id?: string
          description?: string | null
          dislike_count?: number
          duration_seconds?: number | null
          episode_number?: number | null
          genre?: Database["public"]["Enums"]["genre"]
          id?: string
          is_editors_pick?: boolean
          is_featured?: boolean
          is_premium?: boolean
          is_premiere?: boolean
          is_premiere_live?: boolean
          is_processed?: boolean
          is_published?: boolean
          is_trending?: boolean
          like_count?: number
          premiere_at?: string | null
          premiere_ended?: boolean
          premiere_scheduled_at?: string | null
          preview_duration_seconds?: number | null
          preview_seconds?: number | null
          preview_type?: string | null
          preview_video_id?: string | null
          price_cents?: number | null
          pricing_model?: Database["public"]["Enums"]["pricing_model"]
          project_id?: string | null
          published_at?: string | null
          purchase_count?: number
          rating_count?: number
          season_number?: number | null
          series_id?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
          view_count?: number
          visibility?: string
          youtube_url?: string | null
          media_type?: string
          album_art_url?: string | null
          mood_tags?: string[]
          lesson_notes?: string | null
          lesson_resources?: Json
          trending_score?: number
          net_score?: number
          share_count?: number
          story_elements?: Json | null
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_history: {
        Row: {
          created_at: string | null
          completed: boolean
          duration_seconds: number
          id: string
          last_position_seconds: number
          progress_seconds: number
          updated_at: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string | null
          completed?: boolean
          duration_seconds?: number
          id?: string
          last_position_seconds?: number
          progress_seconds?: number
          updated_at?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string | null
          completed?: boolean
          duration_seconds?: number
          id?: string
          last_position_seconds?: number
          progress_seconds?: number
          updated_at?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_history_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "trending_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_history_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlist: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watchlist_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "trending_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watchlist_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      premiere_reminders: {
        Row: {
          id: string
          user_id: string
          video_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          video_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          video_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "premiere_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premiere_reminders_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          id: string
          user_id: string
          course_id: string
          enrolled_at: string
          completed_at: string | null
          is_completed: boolean
          last_lesson_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          enrolled_at?: string
          completed_at?: string | null
          is_completed?: boolean
          last_lesson_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          enrolled_at?: string
          completed_at?: string | null
          is_completed?: boolean
          last_lesson_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_last_lesson_id_fkey"
            columns: ["last_lesson_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          id: string
          user_id: string
          video_id: string
          course_id: string
          is_completed: boolean
          completed_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          video_id: string
          course_id: string
          is_completed?: boolean
          completed_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          video_id?: string
          course_id?: string
          is_completed?: boolean
          completed_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      trending_videos: {
        Row: {
          avg_rating: number | null
          bunny_library_id: string | null
          bunny_video_id: string | null
          comment_count: number | null
          content_type: Database["public"]["Enums"]["content_type"] | null
          created_at: string | null
          creator_avatar: string | null
          creator_id: string | null
          creator_name: string | null
          creator_star_level: number | null
          creator_username: string | null
          description: string | null
          dislike_count: number | null
          duration_seconds: number | null
          episode_number: number | null
          genre: Database["public"]["Enums"]["genre"] | null
          id: string | null
          is_editors_pick: boolean | null
          is_featured: boolean | null
          is_premium: boolean | null
          is_premiere_live: boolean | null
          is_processed: boolean | null
          is_published: boolean | null
          is_trending: boolean | null
          like_count: number | null
          premiere_scheduled_at: string | null
          preview_duration_seconds: number | null
          preview_seconds: number | null
          preview_type: string | null
          preview_video_id: string | null
          price_cents: number | null
          pricing_model: Database["public"]["Enums"]["pricing_model"] | null
          published_at: string | null
          purchase_count: number | null
          rating_count: number | null
          season_number: number | null
          series_id: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string | null
          trending_score: number | null
          updated_at: string | null
          video_url: string | null
          view_count: number | null
          youtube_url: string | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      decrement_balance: {
        Args: { profile_id: string; amount: number }
        Returns: undefined
      }
      increment_balance: {
        Args: { profile_id: string; amount: number }
        Returns: undefined
      }
      increment_revenue: {
        Args: { profile_id: string; amount_dollars: number }
        Returns: undefined
      }
      recalculate_star_levels: { Args: never; Returns: undefined }
      recalculate_trending_videos: { Args: never; Returns: undefined }
      viewer_has_access: {
        Args: { p_video_id: string; p_viewer_id: string }
        Returns: boolean
      }
    }
    Enums: {
      content_type: "movie" | "music_video" | "series" | "episode" | "short"
      genre:
        | "sci_fi"
        | "anime"
        | "horror"
        | "romance"
        | "thriller"
        | "comedy"
        | "drama"
        | "experimental"
        | "documentary"
        | "fantasy"
        | "action"
        | "mystery"
        | "pop"
        | "rock"
        | "hip_hop"
        | "electronic"
        | "jazz"
        | "r_and_b"
        | "country"
        | "indie"
        | "classical"
        | "latin"
        | "lo_fi"
        | "ambient"
        | "showcase"
        | "prompt_test"
        | "model_vs_model"
        | "tutorial"
        | "meme"
        | "short_film"
        | "behind_the_scenes"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      payout_status: "pending" | "processing" | "paid" | "failed"
      pricing_model: "free" | "per_video" | "subscription"
      user_role: "viewer" | "creator" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Database

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof DatabaseWithoutInternals, "public">]

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
      content_type: ["movie", "music_video", "series", "episode", "short"],
      genre: [
        "sci_fi",
        "anime",
        "horror",
        "romance",
        "thriller",
        "comedy",
        "drama",
        "experimental",
        "documentary",
        "fantasy",
        "action",
        "mystery",
        "pop",
        "rock",
        "hip_hop",
        "electronic",
        "jazz",
        "r_and_b",
        "country",
        "indie",
        "classical",
        "latin",
        "lo_fi",
        "ambient",
      ],
      payment_status: ["pending", "completed", "failed", "refunded"],
      payout_status: ["pending", "processing", "paid", "failed"],
      pricing_model: ["free", "per_video", "subscription"],
      user_role: ["viewer", "creator", "admin"],
    },
  },
} as const

// Convenience type aliases
export type Genre = Enums<"genre">;
export type ContentType = Enums<"content_type">;
export type PricingModel = Enums<"pricing_model">;
export type PaymentStatus = Enums<"payment_status">;
export type PayoutStatus = Enums<"payout_status">;
export type UserRole = Enums<"user_role">;
