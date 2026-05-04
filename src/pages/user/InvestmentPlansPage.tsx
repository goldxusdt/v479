import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getVisibleInvestmentOptions, getUserInvestmentSelections, getWalletBalances, deleteUserInvestmentSelection } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, TrendingUp, Wallet, ShieldCheck, Info, Clock, ArrowLeft, Trash2 } from 'lucide-react';
import { Gold3DIcon } from '@/components/ui/Gold3DIcon';
import { CountdownTimer } from '@/components/common/CountdownTimer';
import { PlanExpirationTimer } from '@/components/common/PlanExpirationTimer';

export default function InvestmentPlansPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [options, setOptions] = useState<any[]>([]);
  const [selections, setSelections] = useState<any[]>([]);
  const [balances, setBalances] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [optionsData, selectionsData, balancesData] = await Promise.all([
        getVisibleInvestmentOptions(),
        getUserInvestmentSelections(user.id),
        getWalletBalances(user.id)
      ]);
      setOptions(optionsData);
      setSelections(selectionsData);
      setBalances(balancesData);
    } catch (error) {
      console.error('Failed to load investment data:', error);
      toast.error('Failed to load investment plans');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvestment = async (selection: any) => {
    if (selection.status === 'active') {
      toast.error('Cannot delete an active investment plan');
      return;
    }

    if (!confirm(`Are you sure you want to delete this plan? If you have a remaining balance that wasn't refunded, it will be transferred back to your deposit wallet.`)) {
      return;
    }

    setDeletingId(selection.id);
    try {
      const { error } = await deleteUserInvestmentSelection(selection.id);
      if (error) {
        toast.error('Deletion failed: ' + (error as any).message);
      } else {
        toast.success('Investment plan removed and funds transferred if applicable');
        loadData();
      }
    } catch (err: unknown) {
      toast.error('Deletion error: ' + (err as any).message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleInvestClick = (option: any) => {
    navigate(`/deposit?planId=${option.id}&amount=${option.min_amount}`);
  };

  const formatDuration = (days: number, hours: number) => {
    if (days === 0 && hours === 0) return 'Indefinite';
    const parts = [];
    if (days > 0) parts.push(`${days} Day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} Hour${hours !== 1 ? 's' : ''}`);
    return parts.length > 0 ? parts.join(' ') : 'Instant';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="fluid-padding space-y-10 max-w-[1600px] mx-auto overflow-hidden">
      <div className="flex flex-col gap-6 animate-in slide-in-from-top-4 duration-700">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full bg-white/5 border border-white/10 hover:bg-white/10 shrink-0"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Investment <span className="v56-gradient-text">Plans</span>
            </h1>
            <p className="text-muted-foreground flex items-center gap-2 text-sm md:text-base">
              <ShieldCheck className="h-4 w-4" />
              Secure your future with our premium gold-linked ROI plans
            </p>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="v56-glass premium-border px-6 py-3 flex gap-4 items-center rounded-2xl shrink-0">
            <Wallet className="h-5 w-5 text-primary" />
            <div>
              <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Main Balance</p>
              <p className="text-xl md:text-2xl font-bold text-primary leading-tight">${balances?.deposit?.toFixed(2) || '0.00'} USDT</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {options.length > 0 ? (
          options.map((option) => (
            <Card key={option.id} className="v56-glass premium-border relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-glow group">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Gold3DIcon name="roi" size={100} />
              </div>
              
              <CardHeader className="pb-4 border-b border-white/5">
                <div className="flex justify-between items-start mb-2">
                  <Badge className="bg-primary/20 text-primary border-primary/20 font-black uppercase tracking-widest text-[10px]">
                    {option.roi_percentage}% ROI
                  </Badge>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 text-primary">
                      <Clock className="h-4 w-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {formatDuration(option.duration_days, option.duration_hours)}
                      </span>
                    </div>
                    {option.expires_at && (
                      <PlanExpirationTimer 
                        expiresAt={option.expires_at} 
                        onExpired={() => {
                          // Optionally hide locally immediately, though loadData will refresh it
                          setOptions(prev => prev.filter(o => o.id !== option.id));
                        }}
                      />
                    )}
                  </div>
                </div>
                <CardTitle className="text-2xl font-black italic tracking-tighter uppercase">{option.option_name}</CardTitle>
                <CardDescription className="text-xs leading-relaxed opacity-70 line-clamp-2 min-h-[2.5rem]">
                  {option.description || 'Premium gold-backed investment plan with consistent ROI credits.'}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-center">
                    <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground mb-1">Refund Duration</p>
                    <p className="text-sm font-bold text-primary truncate">{formatDuration(option.duration_days, option.duration_hours)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-center">
                    <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground mb-1">Min Amount</p>
                    <p className="text-sm font-bold text-primary truncate">${option.min_amount} USDT</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-center">
                    <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground mb-1">Deposit Fee</p>
                    <p className="text-sm font-bold text-primary truncate">{option.deposit_fee_percentage}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-center">
                    <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground mb-1">Refund Rule</p>
                    <p className="text-xs font-bold text-primary truncate">{option.auto_refund_duration_days || 0} Days</p>
                  </div>
                </div>

                <div className="space-y-1.5 p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="flex justify-between items-center text-[9px] uppercase font-black tracking-widest text-primary">
                    <span>Est. Daily Profit</span>
                    <span>ROI Rate</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">{(option.roi_percentage / 30).toFixed(2)}%</span>
                    <Badge variant="outline" className="text-[9px] font-black border-primary/20">{option.roi_payout_frequency}</Badge>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter>
                <Button 
                  onClick={() => handleInvestClick(option)}
                  className="w-full h-14 rounded-xl font-black uppercase tracking-widest premium-gradient overflow-hidden"
                >
                  Invest Now
                  <TrendingUp className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full v56-glass premium-border p-12 rounded-3xl text-center space-y-4">
            <Info className="h-12 w-12 text-primary mx-auto opacity-50" />
            <h3 className="text-xl font-black uppercase tracking-tight">No Active Plans</h3>
            <p className="text-muted-foreground text-sm">There are currently no active investment plans available for you. Please check back later.</p>
          </div>
        )}
      </div>

      {selections.length > 0 && (
        <div className="space-y-6 pt-10">
          <div className="space-y-1">
            <h2 className="text-xl md:text-2xl font-black flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              My <span className="text-primary">Investments</span>
            </h2>
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Tracking your active and pending positions</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {selections.map((selection) => (
              <Card key={selection.id} className="v56-glass premium-border flex flex-col md:flex-row items-center gap-4 md:gap-6 p-4 md:p-6 overflow-hidden hover:translate-y-0 hover:scale-100 transition-none">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                  <Gold3DIcon name="roi" size={32} className="md:w-12 md:h-12" />
                </div>
                <div className="flex-1 text-center md:text-left space-y-1 w-full overflow-hidden">
                  <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-1">
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[8px] md:text-[9px] uppercase font-black">
                      {selection.investment_options?.option_name}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={`text-[8px] md:text-[9px] uppercase font-black border-none ${
                        selection.status === 'active' ? 'bg-green-500/10 text-green-500' : 
                        selection.status === 'completed' ? 'bg-blue-500/10 text-blue-500' : 
                        'bg-yellow-500/10 text-yellow-500'
                      }`}
                    >
                      {selection.status === 'active' ? 'Active' : 
                       selection.status === 'completed' ? 'Completed' : 
                       'Pending'}
                    </Badge>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black italic tracking-tighter truncate">
                    ${Number(selection.amount).toLocaleString()} <span className="text-xs md:text-sm font-medium text-muted-foreground uppercase">USDT</span>
                  </h3>
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] md:text-xs text-muted-foreground font-bold uppercase tracking-widest">
                      {selection.status === 'active' ? 'Started: ' : 
                       selection.status === 'completed' ? 'Finished: ' : 
                       'Submitted: '}{new Date(selection.selected_at).toLocaleDateString()}
                    </p>
                    {selection.status === 'active' && selection.investment_options && (
                      <CountdownTimer 
                        startDate={selection.selected_at} 
                        durationDays={selection.investment_options.duration_days} 
                        durationHours={selection.investment_options.duration_hours} 
                      />
                    )}
                    {selection.status === 'completed' && (
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-green-500">
                        <ShieldCheck className="h-3 w-3" />
                        Plan Completed
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 w-full md:w-auto">
                  <div className="text-center md:text-right space-y-1 bg-white/5 p-3 md:p-4 rounded-xl border border-white/5 w-full md:w-auto">
                    <p className="text-[9px] md:text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                      {selection.status === 'completed' ? 'Total Earnings' : 'Earnings Est.'}
                    </p>
                    <p className="text-lg md:text-xl font-bold text-green-500 leading-tight">
                      {selection.status === 'active' ? `+$${(selection.amount * (selection.investment_options?.roi_percentage / 100 / 30)).toFixed(2)}/day` : 
                       selection.status === 'completed' ? `+$${(selection.amount * (selection.investment_options?.roi_percentage / 100)).toFixed(2)}` :
                       'Waiting for approval'}
                    </p>
                  </div>
                  
                  {selection.status !== 'active' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[9px] h-8 uppercase font-black tracking-widest text-red-500 hover:text-red-400 hover:bg-red-500/10 gap-1.5"
                      onClick={() => handleDeleteInvestment(selection)}
                      disabled={deletingId === selection.id}
                    >
                      {deletingId === selection.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                      Remove Plan
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="v56-glass premium-border p-8 rounded-3xl bg-primary/5 flex flex-col md:flex-row items-center gap-8 border-dashed hover:translate-y-0 hover:scale-100 transition-none">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border border-primary/20 shrink-0">
          <Info className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2 text-center md:text-left">
          <h4 className="font-black uppercase tracking-widest text-primary">Secure Funding Process</h4>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
            To invest, select your desired amount and send the exact USDT amount to the platform's deposit wallet address.
            Enter your transaction hash for automated on-chain validation. 
            All funds are linked to physical gold asset reserves, ensuring a stable and secure return environment.
          </p>
        </div>
      </div>
    </div>
  );
}
