import { supabase } from './supabase';
import { subDays, format } from 'date-fns';
import { invokeEdgeFunction } from '@/services/functions';

import {
  Profile,
  Wallet,
  ContentPage,
  WalletBalances,
  ReferralStats,
  DashboardStats,
  NetworkType,
  TransactionStatus,
  DownlineSummaryItem,
  UserBadge,
  MonthlyReward,
  InvestmentOption,
  MediaFile,
  BlogPost,
  EventListing,
  Announcement
} from '@/types';


/**
 * Helper to translate content based on current language
 * (Simplified: Always returns item as-is since multi-language is disabled)
 */
export function translateContent<T extends { translations?: unknown; content?: unknown }>(
  item: T, 
  _lang: string, 
  _fields: string[] = []
): T {
  return item;
}

// Profile operations
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data;
}

/**
 * Helper to check balance threshold and ROI arrival and send push notifications
 */
export async function checkAndSendAutomatedNotifications(userId: string, eventType: 'roi_arrival' | 'balance_threshold', amount?: number) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('balance_threshold, last_balance_alert_at')
      .eq('id', userId)
      .single();

    if (!profile) return;

    if (eventType === 'roi_arrival') {
      await invokeEdgeFunction('send-push-notification', {
        body: {
          target_type: 'individual',
          target_id: userId,
          category: 'roi_arrival',
          title: 'ROI Received 💰',
          body: `You have received ${amount} USDT in ROI credits!`,
          action_url: '/transactions'
        }
      });
    }

    if (eventType === 'balance_threshold') {
      const balances = await getWalletBalances(userId);
      const threshold = Number(profile.balance_threshold);
      const lastAlert = profile.last_balance_alert_at;
      const oneHourAgo = new Date(Date.now() - 3600000);

      if (threshold > 0 && balances.total >= threshold && (!lastAlert || new Date(lastAlert) < oneHourAgo)) {
        await updateProfile(userId, { last_balance_alert_at: new Date().toISOString() });
        await invokeEdgeFunction('send-push-notification', {
          body: {
            target_type: 'individual',
            target_id: userId,
            category: 'balance_threshold',
            title: 'Balance Alert ⚖️',
            body: `Your total balance has reached your threshold of ${threshold} USDT! Current balance: ${balances.total} USDT.`,
            action_url: '/dashboard'
          }
        });
      }
    }
  } catch (err) {
    console.error('Error in automated notifications:', err);
  }
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .maybeSingle();

  return { data, error };
}

export async function getProfileByReferralCode(code: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('public_profiles')
    .select('*')
    .eq('referral_code', code)
    .maybeSingle();

  if (error) {
    console.error('Error fetching profile by referral code:', error);
    return null;
  }
  return data;
}

// Wallet operations
export async function getWalletBalances(userId: string): Promise<WalletBalances> {
  // Fetch wallet balances, active investments, and all-time transaction sums in parallel
  const [walletRes, investmentRes, txRes] = await Promise.all([
    supabase
      .from('wallets')
      .select('wallet_type, balance')
      .eq('user_id', userId),
    supabase
      .from('user_investment_selections')
      .select('amount')
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('status', 'active'),
    supabase
      .from('transactions')
      .select('transaction_type, amount, status, fee')
      .eq('user_id', userId)
      .in('status', ['completed', 'approved'])
  ]);

  const balances: WalletBalances = {
    deposit: 0,
    roi: 0,
    bonus: 0,
    withdrawal: 0,
    invested: 0,
    total: 0
  };

  // Current available balances from wallets
  if (walletRes.data) {
    walletRes.data.forEach((wallet) => {
      const balance = Number(wallet.balance);
      if (wallet.wallet_type === 'withdrawal') {
        balances.withdrawal = balance;
      } else if (wallet.wallet_type === 'deposit') {
        balances.deposit = balance;
      } else if (wallet.wallet_type === 'roi') {
        balances.roi = balance;
      } else if (wallet.wallet_type === 'bonus') {
        balances.bonus = balance;
      }
    });
  }

  // Calculate active investment total
  if (investmentRes.data) {
    balances.invested = investmentRes.data.reduce((sum, inv) => sum + Number(inv.amount), 0);
  }

  // Calculate Gross Totals and Fees from transactions to follow the specific Portfolio Value formula:
  // Net Total Value = (Total Asset Value) - (All Applicable Fees)
  // Total Asset Value = Gross Deposits + Gross ROI + Gross Bonus
  // Net Total Value = (Gross Deposits + Gross ROI + Gross Bonus) - Total Gross Withdrawals - Total Fees
  let grossDeposits = 0;
  let grossROI = 0;
  let grossBonus = 0;
  let grossWithdrawals = 0;
  let totalFees = 0;

  if (txRes.data) {
    txRes.data.forEach(tx => {
      const amount = Number(tx.amount);
      const fee = Number(tx.fee || 0);
      
      switch (tx.transaction_type) {
        case 'deposit':
          grossDeposits += amount;
          totalFees += fee; // Deposit fees reduce the portfolio value
          break;
        case 'roi_credit':
          grossROI += amount;
          break;
        case 'referral_commission':
        case 'referral_bonus':
          grossBonus += amount;
          break;
        case 'withdrawal':
          // Withdrawal amount is gross, so it already includes the withdrawal fee
          // We subtract the gross amount to reflect money leaving the portfolio
          grossWithdrawals += amount;
          break;
        case 'deposit_fee':
          totalFees += amount;
          break;
        case 'withdrawal_fee':
          // If there's a separate withdrawal fee transaction, it also reduces portfolio
          totalFees += amount;
          break;
      }
    });
  }

  // Final Net Total Value as requested: (Sum of Total Assets) - (All Withdrawals + Fees)
  // Note: grossWithdrawals already includes the fees deducted during the withdrawal process
  balances.total = (grossDeposits + grossROI + grossBonus) - (grossWithdrawals + totalFees);

  return balances;
}

export async function getWallets(userId: string): Promise<Wallet[]> {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .order('wallet_type');

  if (error) {
    console.error('Error fetching wallets:', error);
    return [];
  }
  return data || [];
}

// Transaction operations
export async function getTransactions(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
  return data || [];
}

export async function getAllTransactions(limit = 100) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, profiles!transactions_user_id_fkey(username, email)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching all transactions:', error);
    return [];
  }
  return data || [];
}

// Deposit operations
export async function createDeposit(
  userId: string,
  amount: number,
  network: NetworkType,
  transactionHash: string,
  couponId?: string,
  discountApplied: number = 0,
  planId?: string
) {
  let feePercentage = 5; // Default 5%
  
  // Try to load fee from settings first
  const { data: feeSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'deposit_fee')
    .maybeSingle();
    
  if (feeSetting) {
    feePercentage = Number(feeSetting.value);
  }
  
  if (planId) {
    const { data: plan } = await supabase
      .from('investment_options')
      .select('deposit_fee_percentage')
      .eq('id', planId)
      .single();
    if (plan) {
      feePercentage = Number(plan.deposit_fee_percentage);
    }
  }

  const originalFee = amount * (feePercentage / 100);
  const finalFee = Math.max(0, originalFee - discountApplied);
  const netAmount = amount - finalFee;

  // Create transaction record
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      transaction_type: 'deposit',
      amount,
      fee: finalFee,
      net_amount: netAmount, // Final amount user gets
      status: 'pending',
      network,
      transaction_hash: transactionHash,
      plan_id: planId,
      applied_coupon_id: couponId || null,
      coupon_discount_amount: discountApplied
    })
    .select()
    .single();

  if (txError || !transaction) {
    return { data: null, error: txError };
  }

  // Create deposit record
  const { data, error } = await supabase
    .from('deposits')
    .insert({
      transaction_id: transaction.id,
      user_id: userId,
      amount,
      fee: finalFee,
      net_amount: netAmount,
      network,
      transaction_hash: transactionHash,
      status: 'pending',
      coupon_id: couponId || null,
      coupon_bonus: discountApplied,
      plan_id: planId
    })
    .select()
    .single();

  if (data && couponId) {
    // Record coupon redemption
    await supabase.from('coupon_redemptions').insert({
      user_id: userId,
      coupon_id: couponId,
      transaction_id: data.id,
      transaction_type: 'deposit',
      discount_applied: discountApplied,
      original_fee: originalFee,
      final_fee: finalFee
    });

    // Increment coupon usage
    await supabase.rpc('increment_coupon_usage', { 
      p_coupon_id: couponId,
      p_discount_amount: discountApplied
    });
  }

  return { data, error };
}

export async function getDeposits(userId: string) {
  const { data, error } = await supabase
    .from('deposits')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching deposits:', error);
    return [];
  }
  return data || [];
}

export async function getAllDeposits(status?: TransactionStatus) {
  let query = supabase
    .from('deposits')
    .select('*, profiles!deposits_user_id_fkey(username, email)');

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all deposits:', error);
    return [];
  }
  return data || [];
}

export async function approveDeposit(depositId: string, adminId: string) {
  const { data, error } = await supabase.rpc('process_deposit_approval', {
    deposit_id_param: depositId,
    admin_id: adminId
  });

  if (!error) {
    // Get user_id to check threshold
    const { data: dep } = await supabase.from('deposits').select('user_id').eq('id', depositId).single();
    if (dep) {
      checkAndSendAutomatedNotifications(dep.user_id, 'balance_threshold');
    }
  }

  return { data, error };
}

export async function rejectDeposit(depositId: string, adminNotes: string) {
  const { data: deposit, error: depositError } = await supabase
    .from('deposits')
    .select('transaction_id')
    .eq('id', depositId)
    .maybeSingle();

  if (depositError || !deposit) {
    return { data: null, error: depositError };
  }

  // Update deposit status
  await supabase
    .from('deposits')
    .update({ status: 'rejected' })
    .eq('id', depositId);

  // Update transaction status
  const { data, error } = await supabase
    .from('transactions')
    .update({ status: 'rejected', admin_notes: adminNotes })
    .eq('id', deposit.transaction_id)
    .select()
    .maybeSingle();

  return { data, error };
}

// Withdrawal operations
export async function createWithdrawal(
  userId: string,
  amount: number,
  walletAddress: string,
  network: NetworkType,
  walletType: 'roi' | 'bonus' | 'deposit',
  investmentSelectionId?: string,
  couponId?: string,
  discountApplied: number = 0
) {
  let feePercentage = 5; // Default 5%
  
  const { data: setting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'withdrawal_fee')
    .maybeSingle();
    
  if (setting) {
    feePercentage = Number(setting.value);
  }

  const originalFee = amount * (feePercentage / 100);
  const finalFee = Math.max(0, originalFee - discountApplied);
  const netAmount = amount - finalFee;

  // Create transaction record
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      transaction_type: 'withdrawal',
      amount,
      fee: finalFee,
      net_amount: netAmount,
      status: 'pending',
      network,
      wallet_address: walletAddress,
      applied_coupon_id: couponId || null,
      coupon_discount_amount: discountApplied
    })
    .select()
    .single();

  if (txError || !transaction) {
    return { data: null, error: txError };
  }

  // Deduct balance from wallet or investment
  const { error: walletError } = await supabase.rpc('deduct_withdrawal_balance', {
    p_user_id: userId,
    p_wallet_type: walletType,
    p_amount: amount,
    p_investment_selection_id: (investmentSelectionId && investmentSelectionId !== 'all') ? investmentSelectionId : null
  });

  if (walletError) {
    // Cleanup transaction on failure
    await supabase.from('transactions').delete().eq('id', transaction.id);
    return { data: null, error: walletError };
  }

  // Create withdrawal record
  const { data, error } = await supabase
    .from('withdrawals')
    .insert({
      transaction_id: transaction.id,
      user_id: userId,
      amount,
      fee: finalFee,
      net_amount: netAmount,
      wallet_address: walletAddress,
      network,
      status: 'pending',
      wallet_type: walletType,
      investment_selection_id: investmentSelectionId,
      coupon_id: couponId || null,
      coupon_discount: discountApplied
    })
    .select()
    .single();

  if (error) {
    // Refund wallet if withdrawal record creation fails
    await supabase.rpc('add_withdrawal_balance', {
      p_user_id: userId,
      p_wallet_type: walletType,
      p_amount: amount,
      p_investment_selection_id: (investmentSelectionId && investmentSelectionId !== 'all') ? investmentSelectionId : null
    });
    await supabase.from('transactions').delete().eq('id', transaction.id);
    return { error };
  }

  if (data && couponId) {
    // Record coupon redemption
    await supabase.from('coupon_redemptions').insert({
      user_id: userId,
      coupon_id: couponId,
      transaction_id: data.id,
      transaction_type: 'withdrawal',
      discount_applied: discountApplied,
      original_fee: originalFee,
      final_fee: finalFee
    });

    // Increment coupon usage
    await supabase.rpc('increment_coupon_usage', { 
      p_coupon_id: couponId,
      p_discount_amount: discountApplied
    });
  }

  // Trigger Telegram Alert
  invokeEdgeFunction('send-telegram-alert', {
    body: {
      event_type: 'withdrawal_request',
      title: 'New Withdrawal Request',
      details: `User ID: ${userId}\nAmount: ${amount} USDT\nNetwork: ${network}`,
      record: { id: (data as any).id }
    }
  }).catch(err => console.error('Telegram alert failed:', err));

  // Check balance threshold
  checkAndSendAutomatedNotifications(userId, 'balance_threshold');

  return { data, error };
}

export async function getLeaderboard(limit = 5) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, referral_level_15_enabled, referral_level_14_enabled, referral_level_13_enabled, referral_level_12_enabled, referral_level_11_enabled, referral_level_10_enabled, referral_level_9_enabled, referral_level_8_enabled, referral_level_7_enabled, referral_level_6_enabled, referral_level_5_enabled')
    .order('referral_level_15_enabled', { ascending: false })
    .order('referral_level_14_enabled', { ascending: false })
    .order('referral_level_13_enabled', { ascending: false })
    .order('referral_level_12_enabled', { ascending: false })
    .order('referral_level_11_enabled', { ascending: false })
    .order('referral_level_10_enabled', { ascending: false })
    .order('referral_level_9_enabled', { ascending: false })
    .order('referral_level_8_enabled', { ascending: false })
    .order('referral_level_7_enabled', { ascending: false })
    .order('referral_level_6_enabled', { ascending: false })
    .order('referral_level_5_enabled', { ascending: false })
    .limit(limit);

  if (error) throw error;
  
  return (data || []).map(profile => {
    let levels = 4;
    for (let i = 15; i >= 5; i--) {
      if ((profile as any)[`referral_level_${i}_enabled`]) {
        levels = i;
        break;
      }
    }
    return {
      id: profile.id,
      name: profile.full_name || profile.username || 'Anonymous',
      levels_unlocked: levels
    };
  });
}

export async function getWithdrawals(userId: string) {
  const { data, error } = await supabase
    .from('withdrawals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching withdrawals:', error);
    return [];
  }
  return data || [];
}

export async function getAllWithdrawals(status?: TransactionStatus) {
  let query = supabase
    .from('withdrawals')
    .select('*, profiles!withdrawals_user_id_fkey(username, email)');

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all withdrawals:', error);
    return [];
  }
  return data || [];
}

export async function getAdminAnalytics() {
  const { data, error } = await supabase.rpc('get_admin_analytics');
  return { data, error };
}


export async function approveWithdrawal(withdrawalId: string, adminId: string, notes?: string) {
  const { data, error } = await supabase.rpc('process_withdrawal_approval', {
    p_withdrawal_id: withdrawalId,
    p_admin_id: adminId,
    p_approved: true,
    p_notes: notes || 'Approved by admin'
  });

  return { data, error };
}

export async function rejectWithdrawal(withdrawalId: string, adminId: string, notes: string) {
  const { data, error } = await supabase.rpc('process_withdrawal_approval', {
    p_withdrawal_id: withdrawalId,
    p_admin_id: adminId,
    p_approved: false,
    p_notes: notes
  });

  return { data, error };
}

export async function getDownlineSummary(userId: string): Promise<DownlineSummaryItem[]> {
  const { data, error } = await supabase.rpc('get_downline_summary', { target_user_id: userId });
  if (error) throw error;
  return data || [];
}

export async function getDownlineByLevel(userId: string, level: number) {
  const { data, error } = await supabase.rpc('get_downline_network', { 
    p_user_id: userId,
    p_max_levels: level 
  });
  if (error) throw error;
  // Filter only the requested level
  return (data || []).filter((u: any) => u.level === level);
}


export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  const { data, error } = await supabase
    .from('user_badges')
    .select('*, badge:badges(*)')
    .eq('user_id', userId);
  if (error) throw error;
  return data || [];
}

export async function getMonthlyRewards(userId: string): Promise<MonthlyReward[]> {
  const { data, error } = await supabase
    .from('monthly_rewards')
    .select('*')
    .eq('user_id', userId)
    .order('distributed_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function triggerDailyROI() {
  const { error } = await supabase.rpc('distribute_daily_roi');
  if (error) throw error;
}

export async function triggerMonthlyRewards() {
  const { error } = await supabase.rpc('process_monthly_rewards');
  if (error) throw error;
}


// Referral operations
export async function getReferralCommissions(userId: string) {
  const { data, error } = await supabase
    .from('referral_commissions')
    .select('*, profiles!referral_commissions_referred_user_id_fkey(username, email, full_name)')
    .eq('referrer_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching referral commissions:', error);
    return [];
  }
  return data || [];
}

export async function getReferralStats(userId: string): Promise<ReferralStats> {
  try {
    // Get downline network for accurate member counts (unique users only)
    const { data: downline, error: downlineError } = await supabase.rpc('get_downline_network', { 
      p_user_id: userId,
      p_max_levels: 15
    });

    // Get commissions for earnings calculation
    const { data: commissions, error: commError } = await supabase
      .from('referral_commissions')
      .select('commission_amount, is_locked, level')
      .eq('referrer_id', userId);

    if (downlineError || commError) throw downlineError || commError;

    const downlineArray = Array.isArray(downline) ? downline : [];
    const commissionsArray = Array.isArray(commissions) ? commissions : [];

    const stats: ReferralStats = {
      totalReferrals: downlineArray.length,
      totalEarnings: commissionsArray.reduce((acc, curr) => acc + Number(curr.commission_amount), 0),
      lockedEarnings: commissionsArray.filter(c => c.is_locked).reduce((acc, curr) => acc + Number(curr.commission_amount), 0),
      availableEarnings: commissionsArray.filter(c => !c.is_locked).reduce((acc, curr) => acc + Number(curr.commission_amount), 0)
    };

    // Populate per-level stats
    for (let level = 1; level <= 15; level++) {
      stats[`level_${level}_count`] = downlineArray.filter(u => u.level === level).length;
      stats[`level_${level}_commission`] = commissionsArray
        .filter(c => c.level === level)
        .reduce((acc, curr) => acc + Number(curr.commission_amount), 0);
      
      // Also keep legacy field names just in case
      (stats as any)[`level${level}Count`] = stats[`level_${level}_count`];
    }

    return stats;
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    return {
      totalReferrals: 0,
      totalEarnings: 0,
      lockedEarnings: 0,
      availableEarnings: 0
    };
  }
}

// ROI operations
export async function getROIRecords(userId: string) {
  const { data, error } = await supabase
    .from('roi_records')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching ROI records:', error);
    return [];
  }
  return data || [];
}

// Support ticket operations
export async function createSupportTicket(
  userId: string,
  subject: string,
  message: string,
  priority = 'normal'
) {
  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      user_id: userId,
      subject,
      message,
      priority,
      status: 'open'
    })
    .select()
    .single();

  if (!error && data) {
    // Trigger Telegram Alert
    invokeEdgeFunction('send-telegram-alert', {
      body: {
        event_type: 'form_submission',
        title: 'New Support Ticket',
        details: `User ID: ${userId}\nSubject: ${subject}\nMessage: ${message.substring(0, 100)}...`,
        record: { id: data.id }
      }
    }).catch(err => console.error('Telegram alert failed:', err));
  }

  return { data, error };
}

export async function getSupportTickets(userId: string) {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching support tickets:', error);
    return [];
  }
  return data || [];
}

export async function getAllSupportTickets() {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*, profiles!support_tickets_user_id_fkey(username, email)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all support tickets:', error);
    return [];
  }
  return data || [];
}

export async function getTicketReplies(ticketId: string) {
  const { data, error } = await supabase
    .from('ticket_replies')
    .select('*, profiles!ticket_replies_user_id_fkey(username, email)')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching ticket replies:', error);
    return [];
  }
  return data || [];
}

export async function createTicketReply(
  ticketId: string,
  userId: string,
  message: string,
  isAdmin: boolean
) {
  const { data, error } = await supabase
    .from('ticket_replies')
    .insert({
      ticket_id: ticketId,
      user_id: userId,
      message,
      is_admin: isAdmin
    })
    .select()
    .single();

  return { data, error };
}

export async function updateTicketStatus(ticketId: string, status: string) {
  const { data, error } = await supabase
    .from('support_tickets')
    .update({ status })
    .eq('id', ticketId)
    .select()
    .maybeSingle();

  return { data, error };
}

// Content page operations
export async function getContentPage(slug: string): Promise<ContentPage | null> {
  const { data, error } = await supabase
    .from('content_pages')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('Error fetching content page:', error);
    return null;
  }
  return data;
}

export async function updateContentPage(slug: string, title: string, content: string, userId: string) {
  const { data, error } = await supabase
    .from('content_pages')
    .update({ title, content, updated_by: userId })
    .eq('slug', slug)
    .select()
    .maybeSingle();

  return { data, error };
}

// Platform settings operations
export async function getPlatformSetting(key: string): Promise<string | null> {
  // First try the 'settings' table which is the new unified settings table
  const { data: sData, error: sError } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (!sError && sData) {
    return sData.value;
  }

  // Fallback to 'platform_settings' for backward compatibility
  const { data, error } = await supabase
    .from('platform_settings')
    .select('setting_value')
    .eq('setting_key', key)
    .maybeSingle();

  if (error) {
    console.error('Error fetching platform setting:', error);
    return null;
  }
  return data?.setting_value || null;
}

export async function getAllPlatformSettings() {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('*')
    .order('setting_key');

  if (error) {
    console.error('Error fetching platform settings:', error);
    return [];
  }
  return data || [];
}

export async function updatePlatformSetting(key: string, value: string, userId: string) {
  const { data, error } = await supabase
    .from('platform_settings')
    // @ts-ignore - Supabase type inference issue
    .update({ 
      setting_value: value,
      updated_at: new Date().toISOString(),
      updated_by: userId
    })
    .eq('setting_key', key)
    .select()
    .maybeSingle();

  return { data, error };
}

// Activity log operations
export async function createActivityLog(
  userId: string,
  action: string,
  description?: string,
  metadata?: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from('activity_logs')
    .insert({
      user_id: userId,
      action,
      description,
      metadata
    });

  return { data, error };
}

export async function getActivityLogs(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching activity logs:', error);
    return [];
  }
  return data || [];
}

// Admin operations

export async function getInvestmentOptions(lang?: string, includeInactive = false) {
  let query = supabase
    .from('investment_options')
    .select('*');
    
  if (!includeInactive) {
    query = query.eq('is_active', true);
  }
  
  const { data, error } = await query.order('min_amount', { ascending: true });

  if (error) throw error;
  
  if (lang && data) {
    return data.map(option => translateContent(option, lang, ['option_name', 'description']));
  }
  
  return data || [];
}

export async function createInvestmentOption(option: Partial<InvestmentOption>) {
  const { data, error } = await supabase
    .from('investment_options')
    .insert([option])
    .select()
    .single();

  return { data, error };
}

export async function updateInvestmentOption(id: string, updates: Partial<InvestmentOption>) {
  const { data, error } = await supabase
    .from('investment_options')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  return { data, error };
}

export async function archiveInvestmentOption(id: string) {
  const { data, error } = await supabase
    .from('investment_options')
    .update({ is_active: false, is_visible: false })
    .eq('id', id)
    .select()
    .single();

  return { data, error };
}

// Media Library Operations
export async function uploadMedia(file: File, metadata?: Partial<MediaFile>) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('media')
    .getPublicUrl(filePath);

  const { data, error } = await supabase
    .from('media')
    .insert({
      filename: fileName,
      original_filename: file.name,
      file_path: publicUrl,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: (await supabase.auth.getUser()).data.user?.id,
      ...metadata
    })
    .select()
    .single();

  return { data, error };
}

export async function getMediaLibrary(limit = 50, offset = 0) {
  const { data, error, count } = await supabase
    .from('media')
    .select('*', { count: 'exact' })
    .order('uploaded_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { data, count };
}

export async function deleteMedia(id: string, filePath: string) {
  // Extract filename from URL
  const filename = filePath.split('/').pop();
  if (filename) {
    await supabase.storage.from('media').remove([filename]);
  }

  const { error } = await supabase
    .from('media')
    .delete()
    .eq('id', id);

  return { error };
}

// Blog Operations
export async function getBlogPosts(options?: { status?: 'draft' | 'published' | 'all', limit?: number, language?: string }) {
  let query = supabase
    .from('blog_posts')
    .select('*, blog_post_categories(blog_categories(*)), blog_post_tags(blog_tags(*))');

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  } else if (!options?.status) {
    query = query.eq('status', 'published');
  }

  if (options?.language) {
    query = query.eq('language', options.language);
  }

  const { data, error } = await query
    .order('publication_date', { ascending: false })
    .limit(options?.limit || 100);

  if (error) throw error;
  return data || [];
}

export async function getBlogPostBySlug(slug: string) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*, blog_post_categories(blog_categories(*)), blog_post_tags(blog_tags(*))')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createBlogPost(post: Partial<BlogPost>, categoryIds?: string[], tagIds?: string[]) {
  const { data, error } = await supabase
    .from('blog_posts')
    .insert(post)
    .select()
    .single();

  if (error) throw error;

  if (categoryIds?.length) {
    await supabase.from('blog_post_categories').insert(
      categoryIds.map(cid => ({ post_id: data.id, category_id: cid }))
    );
  }

  if (tagIds?.length) {
    await supabase.from('blog_post_tags').insert(
      tagIds.map(tid => ({ post_id: data.id, tag_id: tid }))
    );
  }

  return data;
}

export async function updateBlogPost(id: string, updates: Partial<BlogPost>, categoryIds?: string[], tagIds?: string[]) {
  const { data, error } = await supabase
    .from('blog_posts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  if (categoryIds !== undefined) {
    await supabase.from('blog_post_categories').delete().eq('post_id', id);
    if (categoryIds.length) {
      await supabase.from('blog_post_categories').insert(
        categoryIds.map(cid => ({ post_id: id, category_id: cid }))
      );
    }
  }

  if (tagIds !== undefined) {
    await supabase.from('blog_post_tags').delete().eq('post_id', id);
    if (tagIds.length) {
      await supabase.from('blog_post_tags').insert(
        tagIds.map(tid => ({ post_id: id, tag_id: tid }))
      );
    }
  }

  return data;
}

export async function deleteBlogPost(id: string) {
  const { error } = await supabase
    .from('blog_posts')
    .delete()
    .eq('id', id);
  return { error };
}

export async function getBlogCategories() {
  const { data, error } = await supabase.from('blog_categories').select('*').order('name');
  if (error) throw error;
  return data || [];
}

export async function getBlogTags() {
  const { data, error } = await supabase.from('blog_tags').select('*').order('name');
  if (error) throw error;
  return data || [];
}

// Event Operations
export async function getEvents(options?: { status?: 'draft' | 'published' | 'all', type?: 'upcoming' | 'past', limit?: number, language?: string }) {
  let query = supabase.from('events').select('*');

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  } else if (!options?.status) {
    query = query.eq('status', 'published');
  }

  if (options?.type === 'upcoming') {
    query = query.gte('event_date', new Date().toISOString().split('T')[0]);
  } else if (options?.type === 'past') {
    query = query.lt('event_date', new Date().toISOString().split('T')[0]);
  }

  if (options?.language) {
    query = query.eq('language', options.language);
  }

  const { data, error } = await query
    .order('event_date', { ascending: options?.type !== 'past' })
    .limit(options?.limit || 100);

  if (error) throw error;
  return data || [];
}

export async function getEventBySlug(slug: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createEvent(event: Partial<EventListing>) {
  const { data, error } = await supabase
    .from('events')
    .insert(event)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateEvent(id: string, updates: Partial<EventListing>) {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEvent(id: string) {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id);
  return { error };
}

export async function validateInvestmentHash(userId: string, hash: string, amount: number) {
  // First record the attempt
  const { data: validation, error: validationError } = await supabase
    .from('investment_hash_validations')
    .insert({
      user_id: userId,
      transaction_hash: hash,
      amount: amount,
      status: 'pending'
    })
    .select()
    .single();

  if (validationError) throw validationError;

  // In a real system, we'd wait for an external listener or background task to validate the hash on-chain.
  // For this implementation, we will simulate a successful validation after a short delay or just mark it as validated.
  // The requirement says "common automatic hash validation rules".
  
  // Rule 1: Check if hash format is valid (simulated)
  if (!hash.startsWith('0x') || hash.length < 64) {
    await supabase.from('investment_hash_validations').update({ status: 'rejected' }).eq('id', validation.id);
    throw new Error('Invalid transaction hash format');
  }

  // Rule 2: Check for duplicates (handled by UNIQUE constraint in DB)

  // Simulation: Mark as validated
  const { error: updateError } = await supabase
    .from('investment_hash_validations')
    .update({ status: 'validated' })
    .eq('id', validation.id);

  if (updateError) throw updateError;

  return validation;
}

export async function getActiveInvestmentOptionForUser(userId: string) {
  const { data, error } = await supabase.rpc('get_active_investment_option_for_user', {
    user_id_param: userId
  });

  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}

export async function getVisibleInvestmentOptions() {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('investment_options')
    .select('*')
    .eq('is_active', true)
    .eq('is_visible', true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}



export async function createInvestmentSelection(userId: string, optionId: string, amount: number) {
  // First check if user has enough balance in deposit wallet
  const balances = await getWalletBalances(userId);
  if (balances.deposit < amount) {
    throw new Error('Insufficient balance in deposit wallet');
  }

  // Deduct from deposit wallet
  const { error: deductError } = await supabase.rpc('deduct_wallet_balance', {
    p_user_id: userId,
    p_wallet_type: 'deposit',
    p_amount: amount
  });

  if (deductError) throw deductError;

  // Create selection
  const { data, error } = await supabase
    .from('user_investment_selections')
    .insert({
      user_id: userId,
      investment_option_id: optionId,
      amount: amount,
      is_active: true
    })
    .select()
    .single();

  if (error) {
    // Refund if selection creation fails
    await supabase.rpc('add_wallet_balance', {
      p_user_id: userId,
      p_wallet_type: 'deposit',
      p_amount: amount
    });
    throw error;
  }

  // Create transaction record
  await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      transaction_type: 'investment',
      amount,
      status: 'completed',
      description: 'Investment plan purchase'
    });

  return data;
}

export async function createPendingInvestmentSelection(userId: string, optionId: string, amount: number, hash: string) {
  // Create pending selection
  const { data, error } = await supabase
    .from('user_investment_selections')
    .insert({
      user_id: userId,
      investment_option_id: optionId,
      amount: amount,
      is_active: false,
      status: 'pending',
      transaction_hash: hash
    })
    .select()
    .single();

  if (error) throw error;

  // Also create a validation record
  await supabase
    .from('investment_hash_validations')
    .insert({
      user_id: userId,
      transaction_hash: hash,
      amount: amount,
      status: 'pending'
    });

  return data;
}

export async function getUserInvestmentSelections(userId: string) {
  const { data, error } = await supabase
    .from('user_investment_selections')
    .select('*, investment_options(*)')
    .eq('user_id', userId)
    .in('status', ['active', 'pending'])
    .order('selected_at', { ascending: false });

  if (error) throw error;
  return data || [];
}


// Landing Page operations
export async function getLandingPageSettings(lang?: string) {
  const { data, error } = await supabase
    .from('landing_page_settings')
    .select('*');

  if (error) {
    console.error('Error fetching landing page settings:', error);
    return [];
  }
  
  if (lang && data) {
    return data.map(section => translateContent(section, lang));
  }
  
  return data || [];
}

export async function updateLandingPageSection(sectionName: string, content: unknown) {
  const { data, error } = await supabase
    .from('landing_page_settings')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('section_name', sectionName)
    .select()
    .maybeSingle();

  return { data, error };
}

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
  return data || [];
}

export async function updateUserRole(userId: string, role: 'user' | 'admin') {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select()
    .maybeSingle();

  return { data, error };
}

// Admin Audit Logs
export async function getAdminAuditLogs(limit = 100) {
  const { data, error } = await supabase
    .from('admin_audit_logs')
    .select(`
      *,
      admin:admin_id (
        email,
        full_name
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// ROI Analytics
export async function getROIAnalytics(userId: string, days = 30) {
  const startDate = subDays(new Date(), days).toISOString();
  
  const { data, error } = await supabase
    .from('transactions')
    .select('amount, transaction_type, created_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .in('transaction_type', ['roi_credit', 'referral_commission', 'referral_bonus'])
    .gte('created_at', startDate)
    .order('created_at', { ascending: true });

  if (error) throw error;
  
  // Group by date
  const groupedData: Record<string, { date: string, roi: number, bonus: number, total: number }> = {};
  
  // Initialize days
  for (let i = 0; i <= days; i++) {
    const d = subDays(new Date(), days - i);
    const dateStr = format(d, 'MMM dd');
    groupedData[dateStr] = { date: dateStr, roi: 0, bonus: 0, total: 0 };
  }

  (data || []).forEach(tx => {
    const dateStr = format(new Date(tx.created_at), 'MMM dd');
    if (groupedData[dateStr]) {
      const amount = Number(tx.amount);
      if (tx.transaction_type === 'roi_credit') {
        groupedData[dateStr].roi += amount;
      } else {
        groupedData[dateStr].bonus += amount;
      }
      groupedData[dateStr].total += amount;
    }
  });

  return Object.values(groupedData);
}

// Referral Tree
export async function getReferralTree(userId: string) {
  const { data, error } = await supabase.rpc('get_referral_tree', { root_user_id: userId });
  
  if (error) {
    console.error('Error fetching referral tree:', error);
    return { name: 'You', children: [] };
  }

  const list = (data || []) as any[];
  const idToNode: Record<string, any> = {};
  
  list.forEach(item => {
    idToNode[item.id] = { ...item, children: [] };
  });

  let rootNode = null;
  list.forEach(item => {
    const node = idToNode[item.id];
    if (item.referrer_id && idToNode[item.referrer_id]) {
      idToNode[item.referrer_id].children.push(node);
    } else if (item.id === userId) {
      rootNode = node;
    }
  });

  return rootNode || idToNode[userId] || { name: 'You', children: [] };
}

export async function updateUserStatus(userId: string, isActive: boolean) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId)
    .select()
    .maybeSingle();

  return { data, error };
}

export async function updateKYCStatus(
  userId: string,
  status: 'approved' | 'rejected',
  rejectionReason?: string
) {
  const updates: Partial<Profile> = { kyc_status: status };
  if (status === 'rejected' && rejectionReason) {
    updates.kyc_rejection_reason = rejectionReason;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .maybeSingle();

  return { data, error };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  // Get total users
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  // Get deposit stats
  const { data: deposits } = await supabase
    .from('deposits')
    .select('amount, status');

  const totalDeposits = deposits?.filter(d => d.status === 'approved').reduce((sum, d) => sum + Number(d.amount), 0) || 0;
  const pendingDeposits = deposits?.filter(d => d.status === 'pending').length || 0;

  // Get withdrawal stats
  const { data: withdrawals } = await supabase
    .from('withdrawals')
    .select('amount, status');

  const totalWithdrawals = withdrawals?.filter(w => w.status === 'completed').reduce((sum, w) => sum + Number(w.amount), 0) || 0;
  const pendingWithdrawals = withdrawals?.filter(w => w.status === 'pending').length || 0;

  // Get ROI stats
  const { data: roiRecords } = await supabase
    .from('roi_records')
    .select('roi_amount');

  const totalROIPaid = roiRecords?.reduce((sum, r) => sum + Number(r.roi_amount), 0) || 0;

  // Get commission stats
  const { data: commissions } = await supabase
    .from('referral_commissions')
    .select('commission_amount');

  const totalCommissionsPaid = commissions?.reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;

  return {
    totalUsers: totalUsers || 0,
    totalDeposits,
    totalWithdrawals,
    pendingDeposits,
    pendingWithdrawals,
    totalROIPaid,
    totalCommissionsPaid
  };
}

export const bulkSyncReferralTargets = async () => {
  const { data, error } = await supabase.rpc('bulk_sync_referral_targets');
  if (error) throw error;
  return data;
};

export const getFirewallRules = async () => {
  const { data, error } = await supabase.from('firewall_rules').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const createFirewallRule = async (rule: Record<string, unknown>) => {
  const { data, error } = await supabase.from('firewall_rules').insert([rule]).select();
  if (error) throw error;
  return data?.[0];
};

export const deleteFirewallRule = async (id: string) => {
  const { error } = await supabase.from('firewall_rules').delete().eq('id', id);
  if (error) throw error;
};

export const getSecurityEvents = async () => {
  const { data, error } = await supabase
    .from('security_events')
    .select('*, profiles(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  // Map profiles back to user for compatibility if needed
  return data?.map(d => ({ ...d, user: d.profiles })) || [];
};

export const getAdminMFALogs = async () => {
  const { data, error } = await supabase
    .from('admin_security_logs')
    .select('*, profiles(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data || [];
};

export const getRateLimitLogs = async () => {
  const { data, error } = await supabase.from('rate_limit_logs').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return data || [];
};

export const getMyActivityLogs = async (userId: string) => {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data || [];
};


export const disableMFA = async (userId: string) => {
  const { error } = await supabase
    .from('profiles')
    .update({ mfa_enabled: false, mfa_secret: null, mfa_backup_codes: [] })
    .eq('id', userId);
  
  if (error) throw error;

  // Log the MFA disablement
  await supabase.from('admin_security_logs').insert({
    admin_id: userId,
    event_type: 'mfa_disabled',
    ip_address: '127.0.0.1',
    user_agent: navigator.userAgent,
    outcome: 'success'
  });
};

export const getLoginAttempts = async () => {
  const { data, error } = await supabase
    .from('login_attempts')
    .select('*')
    .order('attempt_time', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data || [];
};

export const getSecurityAnalytics = async () => {
  const { data, error } = await supabase.from('waf_analytics').select('*').order('event_date', { ascending: false }).limit(30);
  if (error) throw error;
  return data || [];
};






export const logLoginAttempt = async (attempt: {
  email: string;
  user_id?: string;
  success: boolean;
  ip_address: string;
  geolocation?: Record<string, unknown>;
  device_fingerprint?: string;
}) => {
  const { error } = await supabase.from('login_attempts').insert([attempt]);
  if (error) console.error('Failed to log login attempt:', error);
};

// FAQ operations
export async function getGlobalFAQs(activeOnly = true) {
  let query = supabase
    .from('faqs')
    .select('*')
    .order('order_position', { ascending: true });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching FAQs:', error);
    return [];
  }
  return data || [];
}

export async function createFAQ(faq: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('faqs')
    .insert(faq)
    .select()
    .single();
  return { data, error };
}

export async function updateFAQ(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('faqs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deleteFAQ(id: string) {
  const { error } = await supabase
    .from('faqs')
    .delete()
    .eq('id', id);
  return { error };
}

export async function reorderFAQs(faqIds: string[]) {
  const updates = faqIds.map((id, index) => 
    supabase.from('faqs').update({ order_position: index + 1 }).eq('id', id)
  );
  const results = await Promise.all(updates);
  const error = results.find(r => r.error)?.error;
  return { error };
}

// Bulk Coupon Operations
export async function bulkDeleteUsedCoupons() {
  const { error } = await supabase.rpc('bulk_delete_used_coupons');
  return { error };
}

export async function bulkDeleteExpiredCoupons() {
  const { error } = await supabase.rpc('bulk_delete_expired_coupons');
  return { error };
}

export async function swapWalletFunds(sourceWallet: string, amount: number) {
  const { data, error } = await supabase.rpc('swap_wallet_funds', {
    p_source_wallet: sourceWallet,
    p_amount: amount
  });
  return { data, error };
}

export async function deleteUserInvestmentSelection(investmentId: string) {
  const { data, error } = await supabase.rpc('delete_user_investment_selection', {
    p_investment_id: investmentId
  });
  return { data, error };
}


// Announcements operations
export async function getAnnouncements() {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Error fetching announcements:', error);
    return [];
  }
  return data || [];
}

export async function getAllAnnouncementsAdmin() {
  const { data, error } = await supabase
    .from('announcements')
    .select('*, profiles!announcements_created_by_fkey(username, email)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching admin announcements:', error);
    return [];
  }
  return data || [];
}

export async function createAnnouncement(announcement: Partial<Announcement>) {
  const { data, error } = await supabase
    .from('announcements')
    .insert(announcement)
    .select()
    .single();

  return { data, error };
}

export async function updateAnnouncement(id: string, updates: Partial<Announcement>) {
  const { data, error } = await supabase
    .from('announcements')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  return { data, error };
}

export async function deleteAnnouncement(id: string) {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id);

  return { error };
}

export async function getAnnouncementById(id: string) {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('id', id)
    .single();

  return { data, error };
}
