export type QualificationResult = 'qualified' | 'nurture' | 'cold'

export type PipelineStage = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type ClientLanguage = 'urdu' | 'english' | 'punjabi' | 'sindhi' | 'pashto'

export type ConversationSender = 'ai' | 'student' | 'counselor'

export type ChatAttachmentType = 'image' | 'pdf' | 'document' | 'archive' | 'audio'

export type ChatMessage = {
  id: string
  sender: 'ai' | 'student' | 'counselor'
  counselor_name?: string | null
  message_text: string
  timestamp: string
  stage_tag?: string
  attachment_url?: string | null
  attachment_name?: string | null
  attachment_type?: ChatAttachmentType | null
}

export type KnowledgeBaseCategory =
  | 'country_requirements'
  | 'university_info'
  | 'our_services'
  | 'processing_timelines'
  | 'faq_general'
  | 'compliance_notes'

export type EscalationStatus = 'open' | 'answered' | 'added_to_kb'

export type DocumentStatus = 'requested' | 'uploaded' | 'verified'

export type MeetingStatus = 'scheduled' | 'completed' | 'cancelled'

export type TaskStatus = 'pending' | 'done' | 'snoozed'

export type CounselorAccountStatus = 'active' | 'inactive'

export type MessageChannel = 'email' | 'sms'

export type MessageLogStatus = 'sent' | 'failed'

export type Counselor = {
  id: string
  name: string
  email: string
  phone: string | null
  ad_ref_code: string | null
  status: CounselorAccountStatus
  base_salary: number | null
  commission_rate: number | null
  avatar_url: string | null
  created_at: string
}

export type QualificationFactor = {
  label: string
  value: string
}

export type Client = {
  id: string
  name: string
  email?: string | null
  phone: string
  language: ClientLanguage
  city: string | null
  interested_in?: string | null
  target_country?: string | null
  language_test_interest?: string | null
  counselor_id: string | null
  previous_counselor_id?: string | null
  assigned_by?: string | null
  assigned_at?: string | null
  ad_source: string | null
  registration_date: string
  qualification_score: number | null
  pipeline_stage: PipelineStage
  notes: string | null
  status: 'active' | 'suspended'
  avatar_url?: string | null
  created_at: string
  updated_at: string
  manually_qualified?: boolean
  manually_qualified_at?: string | null
  manually_qualified_by?: string | null
  qualification_factors?: QualificationFactor[]
}

export type Conversation = {
  id: string
  client_id: string
  message_text: string
  sender: ConversationSender
  counselor_name?: string | null
  timestamp: string
  stage_tag: string | null
  attachment_url?: string | null
  attachment_name?: string | null
  attachment_type?: ChatAttachmentType | null
}

export type AIProfileData = {
  goal_country: string | null
  study_field: string | null
  start_date: string | null
  education_level: string | null
  english_test_status: string | null
  budget_type: string | null
  has_passport: boolean | null
  visa_refusals: string | null
  main_concern: string | null
  family_involvement: string | null
  qualification_score: number
  score_rationale: string
  recommended_service_pathway: string
  psychological_notes: string[]
  suggested_talking_points: string[]
}

export type AIProfile = {
  id: string
  client_id: string
  profile_json: AIProfileData | null
  generated_at: string
}

export type KnowledgeBase = {
  id: string
  category: KnowledgeBaseCategory
  topic: string
  answer: string
  added_by: string | null
  added_at: string
  usage_count: number
  is_active: boolean
}

export type Escalation = {
  id: string
  client_id: string
  question_text: string
  conversation_context: Record<string, unknown> | null
  timestamp: string
  status: EscalationStatus
  counselor_response: string | null
  responded_at: string | null
}

export type Document = {
  id: string
  client_id: string
  document_name: string
  status: DocumentStatus
  file_url: string | null
  updated_at: string
}

export type Meeting = {
  id: string
  client_id: string
  counselor_id: string
  scheduled_time: string
  status: MeetingStatus
  pre_brief_sent: boolean
  created_at: string
}

export type Task = {
  id: string
  counselor_id: string
  client_id: string
  task_text: string
  due_date: string | null
  status: TaskStatus
  assigned_by?: string | null
  created_at: string
}

export type Agreement = {
  id: string
  client_id: string
  service_type: string
  fee_amount: number | null
  payment_terms: string | null
  signed: boolean
  signed_at: string | null
  file_url: string | null
  created_at: string
}

export type MessagesLog = {
  id: string
  client_id: string
  channel: MessageChannel | null
  template_used: string | null
  sent_at: string
  status: MessageLogStatus | null
}

export type HRMRecord = {
  id: string
  counselor_id: string
  month: string
  base_salary: number | null
  commissions_earned: number
  deductions: number
  net_payable: number | null
  paid: boolean
}

export type CounselorStatus = {
  id: string
  counselor_id: string
  is_online: boolean
  auto_reply_enabled: boolean
  auto_reply_message: string
  updated_at: string
}

export type ProfileUpdateRequestStatus = 'pending' | 'approved' | 'rejected'

export type ProfileUpdateRequest = {
  id: string
  client_id: string
  triggered_by_message: string
  proposed_changes: Record<string, string>
  reviewed_fields: Record<string, string>
  status: ProfileUpdateRequestStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export type ClientCorrectionRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'applied'
  | 'cancelled'

export type ClientCorrectionRequest = {
  id: string
  client_id: string
  requested_by: string
  branch_id: string
  current_values: Record<string, string>
  proposed_changes: Record<string, string>
  reason: string | null
  status: ClientCorrectionRequestStatus
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  applied_at: string | null
  applied_values: Record<string, string> | null
  created_at: string
  updated_at: string
}
