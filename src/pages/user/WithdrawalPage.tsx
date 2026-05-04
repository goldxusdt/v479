import { ArrowUpFromLine, Clock, Power, History, List, Loader2, Check, ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { sanitizeInput, rateLimit } from '@/services/security';
import { cn } from '@/utils/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { PlanROITimer } from '@/components/common/PlanROITimer';

import { createWithdrawal, getWalletBalances, getProfile } from '@/services/api';
import { supabase } from '@/services/supabase';
import type { WalletBalances, NetworkType, Coupon } from '@/types';

interface ActiveInvestment {
  id: string;
  amount: number;
  investment_option_id: string;
  selected_at: string;
  last_roi_payout_at: string | null;
  investment_options: {
    option_name: string;
  };
}

interface WithdrawalHistoryItem {
  id: string;
  amount: number;
  fee: number;
  coupon_discount?: number;
  status: string;
  created_at: string;
  investment_selection_id: string | null;
  wallet_type: string;
  user_investment_selections?: {
    investment_options: {
      option_name: string;
    }
  }
}

export default function WithdrawalPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [activeInvestments, setActiveInvestments] = useState<ActiveInvestment[]>([]);
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalHistoryItem[]>([]);
  const [autoWithdrawal, setAutoWithdrawal] = useState(false);
  const [withdrawalWalletAddress, setWithdrawalWalletAddress] = useState('');
  const [nextAutoWithdrawalDate, setNextAutoWithdrawalDate] = useState('');
  const [savingAutoWithdrawal, setSavingAutoWithdrawal] = useState(false);
  const [activeTab, setActiveTab] = useState('withdraw');
  const [formData, setFormData] = useState({
    amount: '',
    wallet_type: 'roi' as 'deposit' | 'roi' | 'bonus',
    wallet_address: '',
    network: 'BEP20' as 'BEP20' | 'TRC20',
    investment_selection_id: 'all'
  });

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [verifyingCoupon, setVerifyingCoupon] = useState(false);

  useEffect(() => {
    loadPlatformSettings();
    loadBalances();
    loadProfileSettings();
    loadActiveInvestments();
    loadWithdrawalHistory();
  }, [user]);

  const loadPlatformSettings = async () => {
    // Platform settings are now loaded as needed in other functions
  };

  const loadProfileSettings = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('auto_withdrawal_enabled, withdrawal_wallet_address, next_auto_withdrawal_date')
      .eq('id', user.id)
      .maybeSingle();
    
    if (data) {
      setAutoWithdrawal((data as any).auto_withdrawal_enabled || false);
      setWithdrawalWalletAddress((data as any).withdrawal_wallet_address || '');
      setNextAutoWithdrawalDate((data as any).next_auto_withdrawal_date || '');
    }
  };



  const loadActiveInvestments = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('user_investment_selections')
      .select('id, amount, investment_option_id, selected_at, last_roi_payout_at, investment_options(option_name)')
      .eq('user_id', user.id)
      .eq('status', 'active');
    
    if (error) {
      console.error('Error loading investments:', error);
    } else {
      setActiveInvestments(data as any || []);
    }
  };

  const loadWithdrawalHistory = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('withdrawals')
      .select(`
        id, 
        amount, 
        fee,
        coupon_discount,
        status, 
        created_at, 
        wallet_type,
        investment_selection_id,
        user_investment_selections(
          investment_options(option_name)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading withdrawal history:', error);
    } else {
      setWithdrawalHistory(data as any || []);
    }
  };

  const loadBalances = async () => {
    if (!user) return;
    const data = await getWalletBalances(user.id);
    if (data) setBalances(data);
  };

  const getAvailableBalance = () => {
    if (!balances) return 0;
    
    // If a specific investment is selected, its amount is the available balance
    if (formData.wallet_type === 'deposit' && formData.investment_selection_id !== 'all') {
      const selection = activeInvestments.find(i => i.id === formData.investment_selection_id);
      return selection ? selection.amount : 0;
    }

    switch (formData.wallet_type) {
      case 'deposit':
        return balances.deposit;
      case 'roi':
        return balances.roi;
      case 'bonus':
        return balances.bonus;
      default:
        return 0;
    }
  };

  const calculateNextWithdrawalDate = () => {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // If current date is before 20th, next payout is 20th of current month
    // If current date is on or after 20th, next payout is 20th of next month
    if (currentDay < 20) {
      return new Date(currentYear, currentMonth, 20).toISOString().split('T')[0];
    } else {
      return new Date(currentYear, currentMonth + 1, 20).toISOString().split('T')[0];
    }
  };

  const handleAutoWithdrawalToggle = async (enabled: boolean) => {
    if (!user) return;
    
    if (enabled && !withdrawalWalletAddress) {
      toast.error('Please enter a wallet address first');
      return;
    }

    setSavingAutoWithdrawal(true);
    try {
      const nextDate = enabled ? calculateNextWithdrawalDate() : null;
      
      const updateData: Record<string, any> = {
        auto_withdrawal_enabled: enabled,
        next_auto_withdrawal_date: nextDate
      };

      const { error } = await supabase
        .from('profiles')
        // @ts-ignore - Supabase type issue with dynamic updates
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      setAutoWithdrawal(enabled);
      if (nextDate) setNextAutoWithdrawalDate(nextDate);
      toast.success(enabled ? 'Auto-withdrawal enabled' : 'Auto-withdrawal disabled');
    } catch (error) {
      console.error('Failed to update auto-withdrawal:', error);
      toast.error('Failed to update auto-withdrawal setting');
    } finally {
      setSavingAutoWithdrawal(false);
    }
  };

  const handleSaveWalletAddress = async () => {
    if (!user) return;
    
    if (!withdrawalWalletAddress) {
      toast.error('Please enter a wallet address');
      return;
    }

    setSavingAutoWithdrawal(true);
    try {
      const updateData: Record<string, any> = {
        withdrawal_wallet_address: withdrawalWalletAddress
      };

      const { error } = await supabase
        .from('profiles')
        // @ts-ignore - Supabase type issue with dynamic updates
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Wallet address saved successfully');
    } catch (error) {
      console.error('Failed to save wallet address:', error);
      toast.error('Failed to save wallet address');
    } finally {
      setSavingAutoWithdrawal(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Rate limiting for withdrawal requests
    if (!rateLimit(`withdrawal-${user.id}`, 3, 3600000)) { // 3 per hour
      return;
    }

    setLoading(true);
    try {
      // First check KYC status
      const profile = await getProfile(user.id);
      
      if (!profile || profile.kyc_status !== 'approved') {
        toast.error('KYC verification is required before withdrawal. Please complete KYC verification in your profile.');
        setLoading(false);
        return;
      }

      const amount = parseFloat(formData.amount);
      const minWithdrawal = Number(settings.min_withdrawal || '50');
      const availableBalance = getAvailableBalance();
      const feePercentage = Number(settings.withdrawal_fee || '5');
      const originalFee = amount * (feePercentage / 100);
      const finalFee = parseFloat(calculateFee());
      const discountApplied = originalFee - finalFee;

      if (!formData.amount || isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid withdrawal amount');
        setLoading(false);
        return;
      }

      if (amount < minWithdrawal) {
        toast.error(`Minimum withdrawal amount is ${minWithdrawal} USDT`);
        setLoading(false);
        return;
      }

      if (amount > availableBalance) {
        toast.error('Insufficient balance');
        setLoading(false);
        return;
      }

      if (!formData.wallet_address) {
        toast.error('Please enter your wallet address');
        setLoading(false);
        return;
      }

      // Sanitize wallet address
      const sanitizedWalletAddress = sanitizeInput(formData.wallet_address);

      const { error } = await createWithdrawal(
        user.id,
        amount,
        sanitizedWalletAddress,
        formData.network as NetworkType,
        formData.wallet_type,
        formData.investment_selection_id === 'all' ? undefined : formData.investment_selection_id,
        appliedCoupon?.id,
        discountApplied
      );

      if (error) throw error;

      toast.success('Withdrawal request submitted successfully');
      setFormData({
        amount: '',
        wallet_type: 'roi',
        wallet_address: '',
        network: 'BEP20',
        investment_selection_id: 'all'
      });
      loadBalances();
      loadActiveInvestments();
      loadWithdrawalHistory();
    } catch (error: unknown) {
      toast.error((error as any).message || 'Failed to submit withdrawal request');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCoupon = async () => {
    if (!couponCode || !user) return;
    setVerifyingCoupon(true);
    try {
      // For withdrawal, we might want to check the plan if it's a specific plan withdrawal
      let currentPlanId = undefined;
      if (formData.investment_selection_id !== 'all') {
        const inv = activeInvestments.find(i => i.id === formData.investment_selection_id);
        currentPlanId = inv?.investment_option_id;
      }

      const { data, error } = await (supabase as any)
        .rpc('can_use_coupon', {
          p_user_id: user.id,
          p_coupon_code: couponCode.toUpperCase(),
          p_transaction_type: 'withdrawal',
          p_plan_id: currentPlanId || null
        });

      if (error) throw error;

      const result = (Array.isArray(data) ? data[0] : data) as any;

      if (!result || !result.is_valid) {
        toast.error(result?.error.message || 'Invalid or inactive coupon code');
        setAppliedCoupon(null);
      } else {
        const { data: couponData } = await supabase
          .from('coupons')
          .select('*')
          .eq('code', couponCode.toUpperCase())
          .maybeSingle();
        
        if (couponData) {
          const cData = couponData as any;
          
          const amount = parseFloat(formData.amount) || 0;
          const feePercentage = Number(settings.withdrawal_fee || '5');
          const originalFee = amount * (feePercentage / 100);
          let potDiscount = 0;
          if (cData.discount_type === 'percentage') {
            potDiscount = originalFee * (cData.discount_value / 100);
          } else {
            potDiscount = cData.discount_value;
          }

          if (potDiscount <= 0 && amount > 0) {
            toast.error('This coupon provides no discount for the current amount.');
            setAppliedCoupon(null);
            return;
          }

          setAppliedCoupon(cData as Coupon);
          const discountDisplay = cData.discount_type === 'percentage' 
            ? `${cData.discount_value}%` 
            : `${cData.discount_value} USDT`;
          toast.success(`Coupon applied! ${discountDisplay} discount on withdrawal fee.`);
        }
      }
    } catch (error) {
      console.error('Coupon verification failed:', error);
      toast.error('Failed to verify coupon');
    } finally {
      setVerifyingCoupon(false);
    }
  };

  const calculateFee = () => {
    const amount = parseFloat(formData.amount) || 0;
    const feePercentage = Number(settings.withdrawal_fee || '5');
    const originalFee = amount * (feePercentage / 100);
    
    let discountAmount = 0;
    if (appliedCoupon) {
      if (appliedCoupon.discount_type === 'percentage') {
        discountAmount = originalFee * (appliedCoupon.discount_value / 100);
      } else {
        discountAmount = appliedCoupon.discount_value;
      }
    }
    
    return Math.max(0, originalFee - discountAmount).toFixed(2);
  };

  const calculateNetAmount = () => {
    const amount = parseFloat(formData.amount) || 0;
    const fee = parseFloat(calculateFee());
    return (amount - fee).toFixed(2);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold v56-gradient-text">Withdraw Funds</h1>
          <p className="text-muted-foreground">Manage your withdrawals and investment plans</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="v56-glass premium-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase">ROI Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{balances?.roi?.toFixed(2) || '0.00'} USDT</p>
          </CardContent>
        </Card>

        <Card className="v56-glass premium-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Bonus Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{balances?.bonus?.toFixed(2) || '0.00'} USDT</p>
          </CardContent>
        </Card>

        <Card className="v56-glass premium-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Deposit Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{balances?.deposit?.toFixed(2) || '0.00'} USDT</p>
          </CardContent>
        </Card>

        <Card className="v56-glass premium-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Withdrawal Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{balances?.withdrawal?.toFixed(2) || '0.00'} USDT</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md bg-background/50 border border-border p-1 h-auto">
          <TabsTrigger value="withdraw" className="flex items-center gap-2 py-2">
            <ArrowUpFromLine className="h-4 w-4" />
            <span>Withdraw</span>
          </TabsTrigger>
          <TabsTrigger value="catalog" className="flex items-center gap-2 py-2">
            <List className="h-4 w-4" />
            <span>Plans</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2 py-2">
            <History className="h-4 w-4" />
            <span>History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="withdraw" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="v56-glass premium-border">
                <CardHeader>
                  <CardTitle>Request Withdrawal</CardTitle>
                  <CardDescription>Withdraw funds from your chosen wallet</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="wallet_type">Source Wallet</Label>
                        <Select
                          value={formData.wallet_type}
                          onValueChange={(value: 'deposit' | 'roi' | 'bonus') =>
                            setFormData({ ...formData, wallet_type: value, investment_selection_id: 'all' })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="roi">ROI Wallet</SelectItem>
                            <SelectItem value="bonus">Bonus Wallet</SelectItem>
                            <SelectItem value="deposit">Deposit Wallet</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.wallet_type === 'deposit' && (
                        <div className="space-y-2">
                          <Label htmlFor="investment_plan">Select Specific Plan (Optional)</Label>
                          <Select
                            value={formData.investment_selection_id}
                            onValueChange={(value) => setFormData({ ...formData, investment_selection_id: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="All deposits" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Main Deposit Wallet</SelectItem>
                              {activeInvestments.map((inv) => (
                                <SelectItem key={inv.id} value={inv.id}>
                                  {inv.investment_options?.option_name} ({inv.amount.toFixed(2)} USDT)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount (USDT)</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Available: {getAvailableBalance().toFixed(2)} USDT
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="network">Network</Label>
                        <Select
                          value={formData.network}
                          onValueChange={(value: 'BEP20' | 'TRC20') =>
                            setFormData({ ...formData, network: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BEP20">BNB Smart Chain (BEP20)</SelectItem>
                            <SelectItem value="TRC20">Tron (TRC20)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="wallet_address">Destination Wallet Address</Label>
                      <Input
                        id="wallet_address"
                        placeholder="Enter your USDT wallet address"
                        value={formData.wallet_address}
                        onChange={(e) => setFormData({ ...formData, wallet_address: e.target.value })}
                      />
                      <div className="space-y-2">
                        <Label htmlFor="coupon">Coupon Code (Optional)</Label>
                        <div className="flex gap-2">
                          <Input
                            id="coupon"
                            placeholder="GOLD10"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            className="uppercase font-bold tracking-widest"
                            disabled={loading || verifyingCoupon || !!appliedCoupon}
                          />
                          {appliedCoupon ? (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              className="text-destructive" 
                              onClick={() => {
                                setAppliedCoupon(null);
                                setCouponCode('');
                              }}
                            >
                              Remove
                            </Button>
                          ) : (
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={handleVerifyCoupon}
                              disabled={!couponCode || verifyingCoupon}
                            >
                              {verifyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                            </Button>
                          )}
                        </div>
                        {appliedCoupon && (
                          <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Coupon Applied
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Withdrawal Amount</span>
                        <span>{parseFloat(formData.amount || '0').toFixed(2)} USDT</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Original Fee (5%)</span>
                        <span className="text-destructive">-${(parseFloat(formData.amount || '0') * 0.05).toFixed(2)} USDT</span>
                      </div>
                      {appliedCoupon && (
                        <div className="flex justify-between text-sm text-green-500 font-bold">
                          <span>Coupon Discount</span>
                          <span>-${(parseFloat(formData.amount || '0') * 0.05 - parseFloat(calculateFee())).toFixed(2)} USDT</span>
                        </div>
                      )}
                      <div className="border-t border-border pt-2 flex justify-between font-bold">
                        <span>Estimated Net Amount</span>
                        <span className="text-primary">{calculateNetAmount()} USDT</span>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Submit Withdrawal Request'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Alert className="border-primary/20 bg-primary/5">
                <Clock className="h-4 w-4 text-primary" />
                <AlertTitle>Withdrawal Information</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                    <li>Minimum withdrawal: 50 USDT</li>
                    <li>Withdrawals are processed manually for security</li>
                    <li>Withdrawals from active plans will reduce the plan balance</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>

            <div className="space-y-6">
              <Card className="v56-glass premium-border">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Power className="h-5 w-5 text-primary" />
                    <CardTitle>Auto-Withdrawal</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto_withdraw">Enable Auto-Withdraw</Label>
                    <Switch
                      id="auto_withdraw"
                      checked={autoWithdrawal}
                      onCheckedChange={handleAutoWithdrawalToggle}
                      disabled={savingAutoWithdrawal || !withdrawalWalletAddress}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Withdrawal to your saved wallet on the 20th of each month.
                  </p>
                  
                  {autoWithdrawal && nextAutoWithdrawalDate && (
                    <div className="p-2 rounded bg-primary/10 text-[10px] flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>Next scheduled: {new Date(nextAutoWithdrawalDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  <div className="space-y-2 pt-2">
                    <Label className="text-xs">Saved Wallet Address</Label>
                    <div className="flex gap-2">
                      <Input
                        value={withdrawalWalletAddress}
                        onChange={(e) => setWithdrawalWalletAddress(e.target.value)}
                        className="text-xs"
                      />
                      <Button size="sm" onClick={handleSaveWalletAddress} disabled={savingAutoWithdrawal}>
                        Save
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="catalog" className="mt-6">
          <Card className="v56-glass premium-border">
            <CardHeader>
              <CardTitle>Deposit Plan Catalog</CardTitle>
              <CardDescription>All your active investment plans and their current balances</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5">
                      <th className="text-left py-3 px-4 text-[10px] uppercase font-black tracking-widest text-muted-foreground">Plan Name</th>
                      <th className="text-right py-3 px-4 text-[10px] uppercase font-black tracking-widest text-muted-foreground">Current Amount</th>
                      <th className="text-center py-3 px-4 text-[10px] uppercase font-black tracking-widest text-muted-foreground">Next ROI</th>
                      <th className="text-center py-3 px-4 text-[10px] uppercase font-black tracking-widest text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeInvestments.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-muted-foreground uppercase text-xs font-bold tracking-widest opacity-40">
                          No active investment plans found.
                        </td>
                      </tr>
                    ) : (
                      activeInvestments.map((inv) => (
                        <tr key={inv.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-4 px-4 font-bold">{inv.investment_options?.option_name}</td>
                          <td className="py-4 px-4 text-right font-black text-primary tabular-nums">{inv.amount.toFixed(2)} USDT</td>
                          <td className="py-4 px-4 text-center">
                            <PlanROITimer 
                              selectionId={inv.id} 
                              lastPayoutAt={inv.last_roi_payout_at || inv.selected_at}
                              onPayoutComplete={loadBalances}
                            />
                          </td>
                          <td className="py-4 px-4 text-center">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="rounded-xl font-bold uppercase tracking-widest text-[10px] h-8"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  wallet_type: 'deposit',
                                  investment_selection_id: inv.id,
                                  amount: inv.amount.toString()
                                });
                                setActiveTab('withdraw');
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                            >
                              Withdraw
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card className="v56-glass premium-border">
            <CardHeader>
              <CardTitle>Withdrawal History</CardTitle>
              <CardDescription>Track your past withdrawal requests and their statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-3 px-4">Plan / Wallet</th>
                      <th className="text-right py-3 px-4">Gross Requested</th>
                      <th className="text-right py-3 px-4">Fee Deduction</th>
                      <th className="text-right py-3 px-4">Coupon Reduction</th>
                      <th className="text-right py-3 px-4">Final Net Amount</th>
                      <th className="text-center py-3 px-4">Date & Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawalHistory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-muted-foreground">
                          No withdrawal history found.
                        </td>
                      </tr>
                    ) : (
                      withdrawalHistory.map((item) => (
                        <tr key={item.id} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="py-4 px-4">
                            <div className="font-medium">
                              {item.user_investment_selections?.investment_options?.option_name || (
                                <span className="capitalize">{item.wallet_type} Wallet</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right font-bold">{Number(item.amount || 0).toFixed(2)} USDT</td>
                          <td className="py-4 px-4 text-right text-destructive font-bold">-{Number(item.fee || 0).toFixed(2)} USDT</td>
                          <td className="py-4 px-4 text-right text-green-500 font-bold">-{Number(item.coupon_discount || 0).toFixed(2)} USDT</td>
                          <td className="py-4 px-4 text-right font-black text-primary">{(Number(item.amount || 0) - Number(item.fee || 0) - Number(item.coupon_discount || 0)).toFixed(2)} USDT</td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</span>
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                                item.status === 'pending' && "bg-yellow-500/10 text-yellow-500",
                                item.status === 'approved' && "bg-green-500/10 text-green-500",
                                item.status === 'rejected' && "bg-destructive/10 text-destructive",
                                item.status === 'completed' && "bg-blue-500/10 text-blue-500"
                              )}>
                                {item.status === 'pending' ? 'Requested' : 
                                 item.status === 'approved' ? 'Approved' :
                                 item.status === 'completed' ? 'Sent' : item.status}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
