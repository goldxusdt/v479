import { CheckCircle, Copy, Loader2, Ticket, Check, AlertCircle, TrendingUp, Clock, ShieldCheck, Wallet, ArrowLeft } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useAnalytics } from '@/services/analytics';
import { createDeposit, getPlatformSetting, getVisibleInvestmentOptions } from '@/services/api';
import { supabase } from '@/services/supabase';
import type { NetworkType, Coupon, InvestmentOption } from '@/types';
import { Badge } from '@/components/ui/badge';

interface Tutorial {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  order_index: number;
}

export default function DepositPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();
  const { trackDeposit, trackFunnelStep } = useAnalytics();
  const minDeposit = Number(settings.min_deposit || '100');

  useEffect(() => {
    trackFunnelStep('deposit_page_view', 3);
  }, []);

  const [amount, setAmount] = useState(searchParams.get('amount') || '');
  const [network] = useState<NetworkType>('BEP20'); // Default to BEP20 and removed option field as requested
  const [transactionHash, setTransactionHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [, setLoadingAddresses] = useState(true);
  const [copied, setCopied] = useState(false);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [depositFee, setDepositFee] = useState(0);
  
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [verifyingCoupon, setVerifyingCoupon] = useState(false);

  const [plans, setPlans] = useState<InvestmentOption[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(searchParams.get('planId') || '');
  const [selectedPlan, setSelectedPlan] = useState<InvestmentOption | null>(null);

  // Wallet addresses fetched from platform settings
  const [walletAddresses, setWalletAddresses] = useState({
    BEP20: '',
    TRC20: ''
  });

  useEffect(() => {
    loadWalletAddresses();
    loadTutorials();
    loadDepositSummary();
    loadPlans();
  }, [user]);

  useEffect(() => {
    if (plans.length > 0 && selectedPlanId) {
      const plan = plans.find(p => p.id === selectedPlanId);
      if (plan) {
        setSelectedPlan(plan);
        if (!amount) setAmount(plan.min_amount.toString());
      }
    } else if (plans.length > 0 && !selectedPlanId) {
       // If no plan selected, pick the first one by default
       setSelectedPlanId(plans[0].id);
    }
  }, [plans, selectedPlanId]);

  const loadPlans = async () => {
    try {
      const activePlans = await getVisibleInvestmentOptions();
      setPlans(activePlans || []);
    } catch (error) {
      console.error('Failed to load plans:', error);
    }
  };

  const loadTutorials = async () => {
    try {
      const { data, error } = await supabase
        .from('tutorials')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true })
        .limit(6);

      if (error) throw error;
      setTutorials(data || []);
    } catch (error) {
      console.error('Failed to load tutorials:', error);
    }
  };

  const loadDepositSummary = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('deposits')
        .select('amount, fee')
        .eq('user_id', user.id)
        .eq('status', 'approved');

      if (error) throw error;

      const total = (data || []).reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
      const fees = (data || []).reduce((sum: number, d: any) => sum + (d.fee || 0), 0);
      
      setTotalDeposits(total);
      setDepositFee(fees);
    } catch (error) {
      console.error('Failed to load deposit summary:', error);
    }
  };

  const loadWalletAddresses = async () => {
    setLoadingAddresses(true);
    try {
      const bep20 = await getPlatformSetting('deposit_wallet_bep20');
      const trc20 = await getPlatformSetting('deposit_wallet_trc20');

      setWalletAddresses({
        BEP20: bep20 || 'NOT_CONFIGURED',
        TRC20: trc20 || 'NOT_CONFIGURED'
      });
    } catch (error) {
      console.error('Failed to load wallet addresses:', error);
      toast.error('Failed to load wallet addresses');
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleVerifyCoupon = async () => {
    if (!couponCode || !user) return;
    setVerifyingCoupon(true);
    try {
      const { data, error } = await (supabase as any)
        .rpc('can_use_coupon', {
          p_user_id: user.id,
          p_coupon_code: couponCode.toUpperCase(),
          p_transaction_type: 'deposit',
          p_plan_id: selectedPlanId || null
        });

      if (error) throw error;

      const result = (Array.isArray(data) ? data[0] : data) as any;

      if (!result || !result.is_valid) {
        toast.error(result?.error.message || 'Invalid or inactive coupon code');
        setAppliedCoupon(null);
      } else {
        // Fetch full coupon data to store in state if needed
        const { data: couponData } = await supabase
          .from('coupons')
          .select('*')
          .eq('code', couponCode.toUpperCase())
          .maybeSingle();
        
        if (couponData) {
          const cData = couponData as any;
          
          // Calculate potential discount now to verify it's not zero
          let potDiscount = 0;
          if (cData.discount_type === 'percentage') {
            potDiscount = originalFee * (cData.discount_value / 100);
          } else {
            potDiscount = cData.discount_value;
          }

          if (potDiscount <= 0 && Number(amount) > 0) {
             toast.error('This coupon provides no discount for the current amount.');
             setAppliedCoupon(null);
             return;
          }

          setAppliedCoupon(cData as Coupon);
          const discountDisplay = cData.discount_type === 'percentage' 
            ? `${cData.discount_value}%` 
            : `${cData.discount_value} USDT`;
          toast.success(`Coupon applied! ${discountDisplay} discount on deposit fee.`);
        }
      }
    } catch (error) {
      console.error('Coupon verification failed:', error);
      toast.error('Failed to verify coupon');
    } finally {
      setVerifyingCoupon(false);
    }
  };

  const currentFeePercentage = selectedPlan?.deposit_fee_percentage ?? 5;
  const currentWalletAddress = walletAddresses[network];
  
  const originalFee = Number(amount) * (currentFeePercentage / 100);
  
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === 'percentage') {
      discountAmount = originalFee * (appliedCoupon.discount_value / 100);
    } else {
      discountAmount = appliedCoupon.discount_value;
    }
  }
  
  const finalFee = Math.max(0, originalFee - discountAmount);
  const netAmount = Number(amount) - finalFee;
  const totalReceived = netAmount;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentWalletAddress);
    setCopied(true);
    toast.success('Wallet address copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const isSubmitting = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting.current) return;

    if (!currentWalletAddress || currentWalletAddress === 'NOT_CONFIGURED') {
      toast.error('Deposit wallet address not configured. Please contact admin.');
      return;
    }

    if (Number(amount) < minDeposit) {
      toast.error(`Minimum deposit is ${minDeposit} USDT`);
      return;
    }

    if (selectedPlan && Number(amount) < selectedPlan.min_amount) {
      toast.error(`Minimum investment for ${selectedPlan.option_name} is ${selectedPlan.min_amount} USDT`);
      return;
    }

    if (!transactionHash) {
      toast.error('Please enter transaction hash');
      return;
    }

    setLoading(true);
    isSubmitting.current = true;
    try {
      const { error: depositError } = await createDeposit(
        user.id, 
        Number(amount), 
        network, 
        transactionHash,
        appliedCoupon?.id,
        discountAmount,
        selectedPlanId || undefined
      );
      
      if (depositError) {
        if (depositError.message.includes('unique_hash')) {
          toast.error('This transaction hash has already been submitted.');
        } else {
          toast.error(depositError.message);
        }
        return;
      }

      trackDeposit(Number(amount));
      trackFunnelStep('deposit_submitted', 4);
      toast.success('Deposit request submitted! Admin will verify manually.');

      setAmount('');
      setTransactionHash('');
      setCouponCode('');
      setAppliedCoupon(null);
    } catch (error) {
      toast.error('Failed to submit deposit request');
    } finally {
      setLoading(false);
      isSubmitting.current = false;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold v56-gradient-text">Deposit & Invest</h1>
          <p className="text-muted-foreground">Select a plan and add USDT to your account</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="v56-glass premium-border col-span-1 md:col-span-3">
          <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2">
              💰 Deposit Summary
            </CardTitle>
            <CardDescription>Your verified financial overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground uppercase font-bold tracking-tighter">Total Deposited</p>
                <p className="text-3xl font-bold text-primary">${totalDeposits.toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground uppercase font-bold tracking-tighter">Total Fees Paid</p>
                <p className="text-3xl font-bold text-destructive">${depositFee.toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground uppercase font-bold tracking-tighter">Net Invested</p>
                <p className="text-3xl font-bold text-green-500">${(totalDeposits - depositFee).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="v56-glass premium-border">
            <CardHeader>
              <CardTitle>Plan Selection</CardTitle>
              <CardDescription>Choose your investment plan type</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Select Plan Type</Label>
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger className="w-full bg-accent/30 h-12">
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.option_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPlan && (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-primary">{selectedPlan.option_name} Features</h4>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Premium Gold Plan</p>
                    </div>
                    <Badge className="bg-primary/20 text-primary border-primary/20">{selectedPlan.roi_percentage}% ROI</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase font-black text-muted-foreground">Duration</p>
                      <div className="flex items-center gap-1 text-xs font-bold">
                        <Clock className="h-3 w-3 text-primary" />
                        {selectedPlan.duration_days} Days
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase font-black text-muted-foreground">Payout</p>
                      <div className="flex items-center gap-1 text-xs font-bold uppercase">
                        <TrendingUp className="h-3 w-3 text-primary" />
                        {selectedPlan.roi_payout_frequency}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase font-black text-muted-foreground">Min Invest</p>
                      <div className="flex items-center gap-1 text-xs font-bold">
                        <Wallet className="h-3 w-3 text-primary" />
                        ${selectedPlan.min_amount}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase font-black text-muted-foreground">Refund Rule</p>
                      <div className="flex items-center gap-1 text-xs font-bold">
                        <CheckCircle className="h-3 w-3 text-primary" />
                        {(selectedPlan as any).auto_refund_duration_days || 0} Days
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase font-black text-muted-foreground">Deposit Fee</p>
                      <div className="flex items-center gap-1 text-xs font-bold">
                        <Ticket className="h-3 w-3 text-primary" />
                        {selectedPlan.deposit_fee_percentage}%
                      </div>
                    </div>
                  </div>

                  {selectedPlan.description && (
                    <p className="text-xs text-muted-foreground italic leading-relaxed border-t border-primary/10 pt-3">
                      "{selectedPlan.description}"
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="v56-glass premium-border">
            <CardHeader>
              <CardTitle>Deposit Address</CardTitle>
              <CardDescription>Send USDT to the address below</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center p-6 bg-accent/20 border border-primary/10 rounded-xl gold-shimmer">
                <div className="bg-white p-2 rounded-lg">
                  <QRCodeSVG value={currentWalletAddress} size={180} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Wallet Address (BEP-20)</Label>
                <div className="flex gap-2">
                  <Input value={currentWalletAddress} readOnly className="font-mono text-xs bg-accent/30" />
                  <Button size="icon" variant="outline" onClick={handleCopy} className="shrink-0 border-primary/20">
                    {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 space-y-3 text-xs">
                <p className="font-bold text-primary flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  DEPOSIT INSTRUCTIONS
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span>Min Deposit: ${selectedPlan?.min_amount || minDeposit} USDT</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span>Deposit Fee: {currentFeePercentage}% (Deducted automatically)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span>Only send USDT on BEP-20 (BSC) Network</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span>Funds will be auto-invested into selected plan upon approval</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="v56-glass premium-border lg:col-span-2 h-fit">
          <CardHeader>
            <CardTitle>Submit Transaction</CardTitle>
            <CardDescription>Enter the amount and TXID hash to verify your deposit</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label htmlFor="amount" className="text-sm font-bold flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    Amount (USDT)
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    min={selectedPlan?.min_amount || minDeposit}
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    disabled={loading}
                    className="bg-accent/30 h-12 text-lg font-bold"
                  />
                  <div className="p-3 rounded-lg bg-accent/20 border border-white/5 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Base Fee ({currentFeePercentage}%)</span>
                      <span className="text-destructive font-bold">-${originalFee.toFixed(2)}</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between text-xs">
                        <span className="text-green-500 font-bold flex items-center gap-1">
                          <Ticket className="h-3 w-3" />
                          Coupon Discount
                        </span>
                        <span className="text-green-500 font-bold">-${discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-black border-t border-white/5 pt-2">
                      <span className="text-primary uppercase tracking-tighter">Total Credit Est.</span>
                      <span className="text-primary">${totalReceived.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="coupon" className="text-sm font-bold flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-primary" />
                    Coupon Code (Optional)
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="coupon"
                        placeholder="GOLD10"
                        className="uppercase bg-accent/30 h-12 font-bold tracking-widest"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        disabled={loading || verifyingCoupon || !!appliedCoupon}
                      />
                    </div>
                    {appliedCoupon ? (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        className="h-12 text-destructive border border-destructive/20 hover:bg-destructive/10" 
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
                        className="h-12 px-6 font-bold border-primary/20 hover:bg-primary/10"
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
                      Success: {appliedCoupon.discount_type === 'percentage' ? `${appliedCoupon.discount_value}%` : `${appliedCoupon.discount_value} USDT`} Discount Applied
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="hash" className="text-sm font-bold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Transaction Hash (TXID)
                </Label>
                <Input
                  id="hash"
                  placeholder="Paste your 0x... transaction hash here"
                  value={transactionHash}
                  onChange={(e) => setTransactionHash(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-accent/30 h-14 font-mono text-sm border-primary/10 focus:border-primary"
                />
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest text-center">
                  Double check your TXID before submitting. Verification usually takes 5-30 minutes.
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full h-16 premium-gradient font-black uppercase tracking-widest text-lg rounded-2xl shadow-lg hover:shadow-primary/20"
                disabled={loading || !selectedPlanId}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Confirm Deposit & Start Plan
                    <TrendingUp className="ml-2 h-6 w-6" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {tutorials.length > 0 && (
        <div className="space-y-6 pt-10 border-t border-white/5">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">Video Tutorials</h2>
            <Badge variant="secondary" className="bg-primary/10 text-primary">Help Center</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tutorials.map((tutorial) => (
              <Card key={tutorial.id} className="v56-glass premium-border overflow-hidden group cursor-pointer" onClick={() => tutorial.video_url && window.open(tutorial.video_url, '_blank')}>
                <div className="aspect-video relative bg-accent/20">
                  {tutorial.thumbnail_url ? (
                    <img src={tutorial.thumbnail_url} alt={tutorial.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <AlertCircle className="h-8 w-8 text-muted-foreground/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="outline" className="rounded-full bg-white/10 backdrop-blur-sm border-white/20">Play Tutorial</Button>
                  </div>
                </div>
                <CardHeader className="p-4">
                  <CardTitle className="text-sm">{tutorial.title}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
