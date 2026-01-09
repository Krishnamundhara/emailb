export interface Campaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  total_emails: number;
  valid_emails: number;
  invalid_emails: number;
  sent_count?: number;
  failed_count?: number;
  status: 'draft' | 'sending' | 'completed' | 'failed' | 'stopped';
  created_at: string;
  started_at?: string;
  completed_at?: string;
  stopped_at?: string;
}

export interface CampaignRecipient {
  id?: string;
  campaign_id: string;
  email: string;
  is_valid: boolean;
  status: 'pending' | 'sent' | 'failed';
  sent_at?: string;
  error?: string;
}

export interface VerificationResult {
  email: string;
  isValid: boolean;
  error?: string;
}

export interface SendResult {
  email: string;
  success: boolean;
  error?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
