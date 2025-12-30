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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_items: {
        Row: {
          answer: Database["public"]["Enums"]["audit_answer"] | null
          audit_id: string
          comment: string | null
          created_at: string
          id: string
          photos: string[] | null
          question_id: string
          updated_at: string
        }
        Insert: {
          answer?: Database["public"]["Enums"]["audit_answer"] | null
          audit_id: string
          comment?: string | null
          created_at?: string
          id?: string
          photos?: string[] | null
          question_id: string
          updated_at?: string
        }
        Update: {
          answer?: Database["public"]["Enums"]["audit_answer"] | null
          audit_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          photos?: string[] | null
          question_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_items_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_items_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "audit_template_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_template_questions: {
        Row: {
          created_at: string
          id: string
          options: Json | null
          order_index: number
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          rating_scale: number | null
          section_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          options?: Json | null
          order_index?: number
          question_text: string
          question_type?: Database["public"]["Enums"]["question_type"]
          rating_scale?: number | null
          section_id: string
        }
        Update: {
          created_at?: string
          id?: string
          options?: Json | null
          order_index?: number
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          rating_scale?: number | null
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_template_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "audit_template_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_template_sections: {
        Row: {
          created_at: string
          id: string
          name: string
          order_index: number
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          order_index?: number
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_template_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "audit_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_templates: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      audits: {
        Row: {
          auditor_id: string
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          plant_id: string
          scheduled_date: string
          score_percentage: number | null
          signature_url: string | null
          status: Database["public"]["Enums"]["audit_status"]
          template_id: string
          updated_at: string
        }
        Insert: {
          auditor_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          plant_id: string
          scheduled_date: string
          score_percentage?: number | null
          signature_url?: string | null
          status?: Database["public"]["Enums"]["audit_status"]
          template_id: string
          updated_at?: string
        }
        Update: {
          auditor_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          plant_id?: string
          scheduled_date?: string
          score_percentage?: number | null
          signature_url?: string | null
          status?: Database["public"]["Enums"]["audit_status"]
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audits_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audits_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "audit_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      client_modules: {
        Row: {
          created_at: string
          group_id: string
          id: string
          module_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          module_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_modules_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "corporate_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address_city: string | null
          address_district: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          cover_photo_url: string | null
          created_at: string
          group_id: string
          id: string
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          cover_photo_url?: string | null
          created_at?: string
          group_id: string
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          cover_photo_url?: string | null
          created_at?: string
          group_id?: string
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "corporate_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_groups: {
        Row: {
          address_city: string | null
          address_district: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          cover_photo_url: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          size_type: Database["public"]["Enums"]["company_size"] | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          address_city?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          cover_photo_url?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          size_type?: Database["public"]["Enums"]["company_size"] | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          address_city?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          cover_photo_url?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          size_type?: Database["public"]["Enums"]["company_size"] | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      deviations: {
        Row: {
          category: Database["public"]["Enums"]["deviation_category"]
          classification:
            | Database["public"]["Enums"]["deviation_classification"]
            | null
          created_at: string
          creator_id: string
          description: string | null
          id: string
          location_details: string | null
          phase: Database["public"]["Enums"]["deviation_phase"] | null
          photos: string[] | null
          plant_id: string
          probability: number
          risk_rating: number | null
          sequence_id: number
          severity: number
          status: Database["public"]["Enums"]["deviation_status"]
          title: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["deviation_category"]
          classification?:
            | Database["public"]["Enums"]["deviation_classification"]
            | null
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          location_details?: string | null
          phase?: Database["public"]["Enums"]["deviation_phase"] | null
          photos?: string[] | null
          plant_id: string
          probability: number
          risk_rating?: number | null
          sequence_id?: number
          severity: number
          status?: Database["public"]["Enums"]["deviation_status"]
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["deviation_category"]
          classification?:
            | Database["public"]["Enums"]["deviation_classification"]
            | null
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          location_details?: string | null
          phase?: Database["public"]["Enums"]["deviation_phase"] | null
          photos?: string[] | null
          plant_id?: string
          probability?: number
          risk_rating?: number | null
          sequence_id?: number
          severity?: number
          status?: Database["public"]["Enums"]["deviation_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deviations_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deviations_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_audit_logs: {
        Row: {
          change_reason: string
          changed_at: string
          changed_by: string
          id: string
          new_values: Json
          old_values: Json
          report_id: string
        }
        Insert: {
          change_reason: string
          changed_at?: string
          changed_by: string
          id?: string
          new_values: Json
          old_values: Json
          report_id: string
        }
        Update: {
          change_reason?: string
          changed_at?: string
          changed_by?: string
          id?: string
          new_values?: Json
          old_values?: Json
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_audit_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_audit_logs_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "kpi_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_definitions: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string
          description: string | null
          formula: string
          frequency: string
          id: string
          is_active: boolean
          name: string
          plant_id: string | null
          target_value: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          formula: string
          frequency?: string
          id?: string
          is_active?: boolean
          name: string
          plant_id?: string | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          formula?: string
          frequency?: string
          id?: string
          is_active?: boolean
          name?: string
          plant_id?: string | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_definitions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_definitions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_definitions_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_reports: {
        Row: {
          acidente_afastamento: number
          acidente_fatal: number
          acidente_prim_socorros: number
          acidente_restricao_trabalho: number
          acidente_tratamento_medico: number
          acidente_veiculos: number
          acoes_abertas: number
          acoes_fechadas: number
          created_at: string
          created_by: string
          dias_perdidos: number
          edit_count: number
          efetivo_contratados: number
          efetivo_empresa: number
          horas_trabalhadas_contratados: number
          horas_trabalhadas_empresa: number
          horas_treinadas_contratados: number
          horas_treinadas_empresa: number
          id: string
          inspecoes_seg_contratados: number
          inspecoes_seg_empresa: number
          is_locked: boolean
          last_edit_reason: string | null
          last_edited_at: string | null
          last_edited_by: string | null
          month: number
          perigos_desvios: number
          plant_id: string
          quase_acidente: number
          safety_walks_contratados: number
          safety_walks_empresa: number
          updated_at: string
          year: number
        }
        Insert: {
          acidente_afastamento?: number
          acidente_fatal?: number
          acidente_prim_socorros?: number
          acidente_restricao_trabalho?: number
          acidente_tratamento_medico?: number
          acidente_veiculos?: number
          acoes_abertas?: number
          acoes_fechadas?: number
          created_at?: string
          created_by: string
          dias_perdidos?: number
          edit_count?: number
          efetivo_contratados?: number
          efetivo_empresa?: number
          horas_trabalhadas_contratados?: number
          horas_trabalhadas_empresa?: number
          horas_treinadas_contratados?: number
          horas_treinadas_empresa?: number
          id?: string
          inspecoes_seg_contratados?: number
          inspecoes_seg_empresa?: number
          is_locked?: boolean
          last_edit_reason?: string | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          month: number
          perigos_desvios?: number
          plant_id: string
          quase_acidente?: number
          safety_walks_contratados?: number
          safety_walks_empresa?: number
          updated_at?: string
          year: number
        }
        Update: {
          acidente_afastamento?: number
          acidente_fatal?: number
          acidente_prim_socorros?: number
          acidente_restricao_trabalho?: number
          acidente_tratamento_medico?: number
          acidente_veiculos?: number
          acoes_abertas?: number
          acoes_fechadas?: number
          created_at?: string
          created_by?: string
          dias_perdidos?: number
          edit_count?: number
          efetivo_contratados?: number
          efetivo_empresa?: number
          horas_trabalhadas_contratados?: number
          horas_trabalhadas_empresa?: number
          horas_treinadas_contratados?: number
          horas_treinadas_empresa?: number
          id?: string
          inspecoes_seg_contratados?: number
          inspecoes_seg_empresa?: number
          is_locked?: boolean
          last_edit_reason?: string | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          month?: number
          perigos_desvios?: number
          plant_id?: string
          quase_acidente?: number
          safety_walks_contratados?: number
          safety_walks_empresa?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpi_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_reports_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_reports_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_id: string | null
          related_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_id?: string | null
          related_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_id?: string | null
          related_type?: string | null
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
      plants: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          is_admin: boolean
          job_title: string | null
          language_pref: string
          name: string
          phone: string | null
          photo_url: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          is_active?: boolean
          is_admin?: boolean
          job_title?: string | null
          language_pref?: string
          name: string
          phone?: string | null
          photo_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          is_admin?: boolean
          job_title?: string | null
          language_pref?: string
          name?: string
          phone?: string | null
          photo_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      training_enrollments: {
        Row: {
          certificate_url: string | null
          created_at: string
          digital_signature_url: string | null
          grade: number | null
          id: string
          session_id: string
          signed_at: string | null
          status: Database["public"]["Enums"]["training_enrollment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          certificate_url?: string | null
          created_at?: string
          digital_signature_url?: string | null
          grade?: number | null
          id?: string
          session_id: string
          signed_at?: string | null
          status?: Database["public"]["Enums"]["training_enrollment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          certificate_url?: string | null
          created_at?: string
          digital_signature_url?: string | null
          grade?: number | null
          id?: string
          session_id?: string
          signed_at?: string | null
          status?: Database["public"]["Enums"]["training_enrollment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_enrollments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_evidence: {
        Row: {
          created_at: string
          description: string | null
          id: string
          photo_url: string
          session_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          photo_url: string
          session_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          photo_url?: string
          session_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_evidence_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_evidence_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          certificate_url: string | null
          completed_at: string | null
          created_at: string
          expiration_date: string | null
          id: string
          institution: string | null
          instructor_id: string
          location_room: string | null
          max_participants: number | null
          modality: Database["public"]["Enums"]["training_modality"] | null
          plant_id: string
          scheduled_date: string
          started_at: string | null
          status: Database["public"]["Enums"]["training_session_status"]
          training_type_id: string
          updated_at: string
        }
        Insert: {
          certificate_url?: string | null
          completed_at?: string | null
          created_at?: string
          expiration_date?: string | null
          id?: string
          institution?: string | null
          instructor_id: string
          location_room?: string | null
          max_participants?: number | null
          modality?: Database["public"]["Enums"]["training_modality"] | null
          plant_id: string
          scheduled_date: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["training_session_status"]
          training_type_id: string
          updated_at?: string
        }
        Update: {
          certificate_url?: string | null
          completed_at?: string | null
          created_at?: string
          expiration_date?: string | null
          id?: string
          institution?: string | null
          instructor_id?: string
          location_room?: string | null
          max_participants?: number | null
          modality?: Database["public"]["Enums"]["training_modality"] | null
          plant_id?: string
          scheduled_date?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["training_session_status"]
          training_type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_training_type_id_fkey"
            columns: ["training_type_id"]
            isOneToOne: false
            referencedRelation: "training_types"
            referencedColumns: ["id"]
          },
        ]
      }
      training_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_mandatory: boolean
          notification_days: number[] | null
          title: string
          training_link: string | null
          updated_at: string
          validity_months: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_mandatory?: boolean
          notification_days?: number[] | null
          title: string
          training_link?: string | null
          updated_at?: string
          validity_months?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_mandatory?: boolean
          notification_days?: number[] | null
          title?: string
          training_link?: string | null
          updated_at?: string
          validity_months?: number
        }
        Relationships: []
      }
      user_companies: {
        Row: {
          company_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_companies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_modules: {
        Row: {
          created_at: string
          id: string
          module_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          module_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          module_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_modules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workflows: {
        Row: {
          completed_at: string | null
          created_at: string
          deadline: string | null
          description: string | null
          deviation_id: string
          evidence_photos: string[] | null
          id: string
          nature: Database["public"]["Enums"]["workflow_nature"] | null
          response_notes: string | null
          responsible_id: string
          sequence_id: number
          status: Database["public"]["Enums"]["workflow_status"]
          title: string
          updated_at: string
          validated_at: string | null
          validator_id: string | null
          validator_notes: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          deviation_id: string
          evidence_photos?: string[] | null
          id?: string
          nature?: Database["public"]["Enums"]["workflow_nature"] | null
          response_notes?: string | null
          responsible_id: string
          sequence_id?: number
          status?: Database["public"]["Enums"]["workflow_status"]
          title: string
          updated_at?: string
          validated_at?: string | null
          validator_id?: string | null
          validator_notes?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          deviation_id?: string
          evidence_photos?: string[] | null
          id?: string
          nature?: Database["public"]["Enums"]["workflow_nature"] | null
          response_notes?: string | null
          responsible_id?: string
          sequence_id?: number
          status?: Database["public"]["Enums"]["workflow_status"]
          title?: string
          updated_at?: string
          validated_at?: string | null
          validator_id?: string | null
          validator_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflows_deviation_id_fkey"
            columns: ["deviation_id"]
            isOneToOne: false
            referencedRelation: "deviations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      audit_answer: "pass" | "fail" | "na"
      audit_status: "planned" | "in_progress" | "completed"
      company_size: "small" | "medium" | "large" | "enterprise"
      deviation_category:
        | "not_applicable"
        | "access_exit"
        | "chemical_handling"
        | "confined_space"
        | "contractor_management"
        | "driving_safety"
        | "electrical_safety"
        | "ergonomics"
        | "excavations"
        | "fire"
        | "housekeeping"
        | "load_handling"
        | "lighting"
        | "loto"
        | "manual_load_handling"
        | "noise"
        | "machinery"
        | "ppe"
        | "procedures"
        | "scaffolding"
        | "signage"
        | "slip_trip_fall"
        | "storage"
        | "wellbeing"
        | "work_at_height"
      deviation_classification:
        | "audit"
        | "environment"
        | "health_safety"
        | "property_security"
        | "social_responsibility"
      deviation_phase: "operations" | "construction"
      deviation_status: "open" | "in_progress" | "done"
      question_type:
        | "pass_fail"
        | "text"
        | "rating"
        | "single_choice"
        | "multiple_choice"
      training_enrollment_status: "pending" | "present" | "absent"
      training_modality: "ead" | "presencial"
      training_session_status:
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
      user_role: "technician" | "supervisor" | "admin"
      workflow_nature: "corrective" | "preventive"
      workflow_status:
        | "pending"
        | "approved"
        | "rejected"
        | "submitted_completed"
        | "submitted_blocked"
        | "returned"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
      audit_answer: ["pass", "fail", "na"],
      audit_status: ["planned", "in_progress", "completed"],
      company_size: ["small", "medium", "large", "enterprise"],
      deviation_category: [
        "not_applicable",
        "access_exit",
        "chemical_handling",
        "confined_space",
        "contractor_management",
        "driving_safety",
        "electrical_safety",
        "ergonomics",
        "excavations",
        "fire",
        "housekeeping",
        "load_handling",
        "lighting",
        "loto",
        "manual_load_handling",
        "noise",
        "machinery",
        "ppe",
        "procedures",
        "scaffolding",
        "signage",
        "slip_trip_fall",
        "storage",
        "wellbeing",
        "work_at_height",
      ],
      deviation_classification: [
        "audit",
        "environment",
        "health_safety",
        "property_security",
        "social_responsibility",
      ],
      deviation_phase: ["operations", "construction"],
      deviation_status: ["open", "in_progress", "done"],
      question_type: [
        "pass_fail",
        "text",
        "rating",
        "single_choice",
        "multiple_choice",
      ],
      training_enrollment_status: ["pending", "present", "absent"],
      training_modality: ["ead", "presencial"],
      training_session_status: [
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
      ],
      user_role: ["technician", "supervisor", "admin"],
      workflow_nature: ["corrective", "preventive"],
      workflow_status: [
        "pending",
        "approved",
        "rejected",
        "submitted_completed",
        "submitted_blocked",
        "returned",
      ],
    },
  },
} as const
