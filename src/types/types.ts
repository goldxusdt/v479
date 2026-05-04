// User and Profile types
export type UserRole = 'user' | 'admin';
export type KYCStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  email: string | null;
  username: string | null;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  city?: string | null;
  country?: string | null;
  postal_code?: string | null;
  role: UserRole;
  referrer_id: string | null;
  referral_code: string;
  kyc_status: KYCStatus;
  kyc_document_url: string | null;
  kyc_document_type?: string | null;
  kyc_id_front?: string | null;
  kyc_id_back?: string | null;
  kyc_selfie?: string | null;
  kyc_ocr_text?: string | null;
  kyc_id_number?: string | null;
  kyc_rejection_reason: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  auto_withdrawal_enabled?: boolean;
  next_auto_withdrawal_date?: string | null;
  last_roi_credit_at?: string | null;
  withdrawal_wallet_address?: string | null;
  performance_usdt?: number;
  performance_score?: number;
  performance_contribution?: number;
  manual_level_1_count?: number;
  performance_ranking?: string;
  referral_system_status?: string;
  referral_levels_overrides?: Record<string, number>;
  referral_level_targets?: Record<string, number>;
  mfa_enabled?: boolean;
  mfa_secret?: string;
  mfa_backup_codes?: string[];

  referral_level_1_enabled?: boolean;
  referral_level_2_enabled?: boolean;
  referral_level_3_enabled?: boolean;
  referral_level_4_enabled?: boolean;
  referral_level_5_enabled?: boolean;
  referral_level_6_enabled?: boolean;
  referral_level_7_enabled?: boolean;
  referral_level_8_enabled?: boolean;
  referral_level_9_enabled?: boolean;
  referral_level_10_enabled?: boolean;
  referral_level_11_enabled?: boolean;
  referral_level_12_enabled?: boolean;
  referral_level_13_enabled?: boolean;
  referral_level_14_enabled?: boolean;
  referral_level_15_enabled?: boolean;
  // is_compounding_enabled removed
  custom_roi_percentage?: number | null;
  target_usdt?: number;
  user_group?: string;
  balance_threshold?: number;
  last_balance_alert_at?: string;
  is_first_admin?: boolean;
  withdrawal_status_notification_enabled?: boolean;
  daily_roi_notification_enabled?: boolean;
}

export interface DownlineSummaryItem {
  level: number;
  member_count: number;
  active_count: number;
  total_volume: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  criteria_type: string;
  criteria_value: number;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  awarded_at: string;
  badge?: Badge;
}

export interface MonthlyReward {
  id: string;
  user_id: string;
  amount: number;
  reward_type: string;
  period_start: string;
  period_end: string;
  distributed_at: string;
}

// Wallet types
export type WalletType = 'deposit' | 'roi' | 'bonus' | 'withdrawal';

export interface Wallet {
  id: string;
  user_id: string;
  wallet_type: WalletType;
  balance: number;
  created_at: string;
  updated_at: string;
}

// Transaction types
export type TransactionType = 'deposit' | 'withdrawal' | 'roi_credit' | 'referral_commission' | 'referral_bonus' | 'deposit_fee' | 'withdrawal_fee' | 'refund' | 'internal_swap';
export type TransactionStatus = 'pending' | 'approved' | 'rejected' | 'completed';
export type NetworkType = 'BEP20' | 'TRC20';

export interface Transaction {
  id: string;
  user_id: string;
  transaction_type: TransactionType;
  amount: number;
  fee: number;
  net_amount: number;
  status: TransactionStatus;
  network: NetworkType | null;
  wallet_address: string | null;
  transaction_hash: string | null;
  admin_notes: string | null;
  plan_id?: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

// Deposit types
export interface Deposit {
  id: string;
  transaction_id: string;
  user_id: string;
  amount: number;
  fee: number;
  net_amount: number;
  network: NetworkType;
  transaction_hash: string;
  status: TransactionStatus;
  plan_id?: string | null;
  created_at: string;
  approved_at: string | null;
  coupon_id: string | null;
  coupon_bonus: number;
}

// Withdrawal types
export interface Withdrawal {
  id: string;
  transaction_id: string;
  user_id: string;
  amount: number;
  fee: number;
  net_amount: number;
  wallet_address: string;
  network: NetworkType;
  status: TransactionStatus;
  cooling_period_end?: string;
  is_referral_bonus: boolean;
  created_at: string;
  approved_at: string | null;
  completed_at: string | null;
  telegram_message_id?: string | null;
  coupon_id: string | null;
  coupon_discount: number;
  wallet_type: 'roi' | 'bonus' | 'deposit';
  investment_selection_id: string | null;
}

// Referral commission types
export interface ReferralCommission {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  deposit_id: string;
  level: number;
  commission_rate: number;
  commission_amount: number;
  locked_until: string;
  is_locked: boolean;
  created_at: string;
  profiles?: {
    username: string | null;
    email: string | null;
    full_name: string | null;
  };
}

// ROI record types
export interface ROIRecord {
  id: string;
  user_id: string;
  deposit_id: string;
  roi_amount: number;
  roi_percentage: number;
  month_number: number;
  created_at: string;
}

// Support ticket types
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: TicketStatus;
  priority: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  admin_reply?: string | null;
  admin_replied_at?: string | null;
  telegram_message_id?: string | null;
}

export interface TicketReply {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

// Content page types
export interface ContentPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

// Activity log types
export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  ip_address?: string | null;
  created_at: string;
}

// Dashboard stats types
export interface DashboardStats {
  totalUsers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  totalROIPaid: number;
  totalCommissionsPaid: number;
}

// Referral stats types
export interface ReferralStats {
  totalReferrals: number;
  totalEarnings: number;
  lockedEarnings: number;
  availableEarnings: number;
  // Support dynamic level fields like level_1_count, level_1_commission, etc.
  [key: string]: number | undefined;
}

// Wallet balances type
export interface WalletBalances {
  deposit: number;
  roi: number;
  bonus: number;
  withdrawal: number;
  invested: number;
  total: number;
}


// Coupon types
export type CouponDiscountType = 'percentage' | 'fixed';
export type CouponRedemptionType = 'deposit' | 'withdrawal' | 'all';

export interface Coupon {
  id: string;
  code: string;
  discount_type: CouponDiscountType;
  discount_value: number;
  percentage?: number;
  description: string | null;
  is_active: boolean;
  expiry_date: string | null;
  valid_from: string | null;
  usage_limit: number;
  used_count: number;
  redemption_type: CouponRedemptionType;
  applicable_plans: string[];
  single_use_per_user: boolean;
  campaign_start_at?: string | null;
  campaign_end_at?: string | null;
  auto_activate?: boolean;
  auto_deactivate?: boolean;
  is_auto_deleted?: boolean;
  deletion_reason?: string | null;
  total_savings?: number;
  created_at: string;
  updated_at: string;
}

export interface CouponRedemption {
  id: string;
  user_id: string;
  coupon_id: string;
  transaction_id: string | null;
  transaction_type: 'deposit' | 'withdrawal';
  discount_applied: number;
  created_at: string;
}

// Upload Log types
export interface UploadLog {
  id: string;
  user_id: string | null;
  file_name: string;
  file_type: string;
  file_size: number;
  status: 'success' | 'failure';
  error_message: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}



// Notification types
export interface PushSubscription {
  id: string;
  user_id: string;
  subscription_json: unknown;
  categories: string[];
  created_at: string;
  updated_at: string;
}

export interface NotificationCategory {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_system: boolean;
  created_at: string;
}

export interface NotificationHistory {
  id: string;
  title: string;
  body: string;
  target_type: 'all' | 'group' | 'individual';
  target_id: string | null;
  action_url: string | null;
  icon_url: string | null;
  sent_at: string;
  category_id: string | null;
  recalled_at: string | null;
  stats: {
    delivered: number;
    clicked: number;
    failed: number;
  };
  created_by: string | null;
  notification_categories?: NotificationCategory;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  body: string;
  category: string;
  category_id: string | null;
  created_at: string;
}

export interface TelegramAlertHistory {
  id: string;
  event_type: string;
  message: string;
  status: 'sent' | 'failed';
  error_message: string | null;
  created_at: string;
}

export interface PlatformSetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// Investment types
export interface InvestmentOption {
  id: string;
  option_name: string;
  description: string | null;
  min_amount: number;
  max_amount: number;
  interest_rate: number;
  roi_percentage: number;
  duration_days: number;
  duration_hours: number;
  deposit_fee_percentage: number;
  coupon_code: string | null;
  roi_payout_frequency: string;
  is_locked: boolean;
  is_active: boolean;
  is_visible: boolean;
  auto_refund_duration_days: number;
  created_at: string;
  updated_at: string;
}

export interface UserInvestmentSelection {
  id: string;
  user_id: string;
  investment_option_id: string;
  amount: number;
  is_active: boolean;
  status: 'active' | 'completed' | 'archived';
  selected_at: string;
  completed_at: string | null;
  investment_options?: InvestmentOption;
  last_roi_payout_at?: string | null;
  total_roi_earned?: number;
}


export type AnnouncementType = 'blog' | 'poster' | 'offer' | 'new_feature' | 'update';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  status: 'published' | 'draft';
  image_url: string | null;
  published_at: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  profiles?: {
    username: string | null;
    email: string | null;
  };
}

// Blog types
export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  author: string;
  publication_date: string;
  featured_image_url: string | null;
  content_body: string;
  excerpt: string | null;
  status: 'draft' | 'published';
  seo_meta_title: string | null;
  seo_meta_description: string | null;
  language: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  blog_categories?: BlogCategory[];
  blog_tags?: BlogTag[];
}

// Event types
export interface EventListing {
  id: string;
  title: string;
  slug: string;
  description: string;
  event_date: string;
  event_time: string;
  timezone: string;
  location: string;
  featured_image_url: string | null;
  registration_link: string | null;
  capacity: number | null;
  category: string | null;
  status: 'draft' | 'published';
  seo_meta_title: string | null;
  seo_meta_description: string | null;
  language: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

// Media types
export interface MediaFile {
  id: string;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  caption: string | null;
  uploaded_at: string;
  uploaded_by: string | null;
}

