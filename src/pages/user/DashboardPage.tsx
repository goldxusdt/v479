import { ArrowDownToLine, ArrowUpFromLine, Users, ArrowRight, Activity, Calendar, Diamond, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Logo } from '@/components/common/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { getTransactions, getWalletBalances, getUserInvestmentSelections, deleteUserInvestmentSelection } from '@/services/api';
import { supabase } from '@/services/supabase';
import { PlanROITimer } from '@/components/common/PlanROITimer';
import { CountdownTimer } from '@/components/common/CountdownTimer';
import { Gold3DIcon } from '@/components/ui/Gold3DIcon';
import type { Transaction, WalletBalances } from '@/types';
import { cn } from '@/utils/utils';

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyRoi, setMonthlyRoi] = useState(10.00);
  const [dailyRoi, setDailyRoi] = useState(0.33);

  useEffect(() => {
    if (user) {
      loadData();
      
      // Setup realtime subscriptions
      const walletsChannel = supabase
        .channel(`public:wallets:user_id=eq.${user.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'wallets', 
          filter: `user_id=eq.${user.id}` 
        }, () => {
          getWalletBalances(user.id).then(setBalances);
        })
        .subscribe();

      const transactionsChannel = supabase
        .channel(`public:transactions:user_id=eq.${user.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'transactions', 
          filter: `user_id=eq.${user.id}` 
        }, () => {
          getTransactions(user.id, 5).then(setTransactions);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(walletsChannel);
        supabase.removeChannel(transactionsChannel);
      };
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { data: settingsData } = await supabase
        .from('settings')
        .select('key, value');
      
      if (settingsData) {
        const monthly = (settingsData as any[]).find(s => s.key === 'monthly_roi_percentage');
        const daily = (settingsData as any[]).find(s => s.key === 'daily_roi_percentage');
        if (monthly) setMonthlyRoi(parseFloat(monthly.value));
        if (daily) setDailyRoi(parseFloat(daily.value));
      }

      const [balancesData, transactionsData, investmentsData] = await Promise.all([
        getWalletBalances(user.id),
        getTransactions(user.id, 5),
        getUserInvestmentSelections(user.id)
      ]);
      setBalances(balancesData);
      setTransactions(transactionsData);
      setInvestments(investmentsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvestment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this investment record? Any leftover funds (capital) will be transferred back to your deposit wallet.')) {
      return;
    }
    
    try {
      const { error } = await deleteUserInvestmentSelection(id);
      if (error) {
        toast.error('Deletion failed: ' + (error as any).message);
      } else {
        toast.success('Investment deleted and funds transferred');
        loadData();
      }
    } catch (err: unknown) {
      toast.error('Error: ' + (err as any).message);
    }
  };

  const totalBalance = balances?.total ?? 0;

  if (loading) {
    return (
      <div className="p-6 space-y-8 animate-pulse">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48 bg-muted rounded-xl" />
          <Skeleton className="h-14 w-64 bg-muted rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 bg-muted rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 w-full bg-muted rounded-2xl" />
      </div>
    );
  }

  const getHighestLevel = () => {
    if (!profile) return 0;
    for (let i = 15; i >= 1; i--) {
      if ((profile as any)[`referral_level_${i}_enabled` as keyof typeof profile]) return i;
    }
    return 0;
  };

  const highestLevel = getHighestLevel();

  return (
    <div className="fluid-padding space-y-8 max-w-[1600px] mx-auto overflow-hidden">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-in slide-in-from-top-4 duration-700">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            {t('dashboard.portfolio').split(' ')[0]} <span className="v56-gradient-text">{t('dashboard.portfolio').split(' ')[1]}</span>
          </h1>
          <p className="text-muted-foreground flex items-center flex-wrap gap-2 text-sm md:text-base">
            <Calendar className="h-4 w-4" />
            {t('dashboard.welcome')}, {profile?.full_name || user?.email?.split('@')[0]}
            <Badge variant="outline" className="ml-2 bg-primary/10 border-primary/20 text-primary font-bold shadow-glow">
              {t('dashboard.member_level', { level: highestLevel })}
            </Badge>
          </p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto hide-scrollbar">
          <div className="v56-glass premium-border px-6 py-3 flex gap-6 items-center rounded-2xl shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center">
                <Gold3DIcon name="roi" size={32} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">{t('dashboard.monthly_roi')}</p>
                <p className="text-xl font-bold text-primary leading-tight">{monthlyRoi.toFixed(2)}%</p>
              </div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center">
                <Gold3DIcon name="analytics" size={32} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">{t('dashboard.daily_roi')}</p>
                <p className="text-xl font-bold text-green-500 leading-tight">{dailyRoi.toFixed(2)}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Assets Card - Primary Focus */}
        <Card className="col-span-1 md:col-span-2 v56-glass premium-border relative overflow-hidden group gold-shimmer min-h-[220px] flex flex-col justify-center">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Logo size={140} />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-[0.2em] font-black text-[10px] text-muted-foreground">Net Total Portfolio Value</CardDescription>
            <CardTitle className="text-3xl md:text-6xl font-black v56-gradient-text text-glow tabular-nums">
              ${totalBalance.toFixed(2)}
              <span className="text-2xl ml-2 font-medium opacity-60">USDT</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="pt-2 flex justify-between items-center gap-3">
               <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary font-bold uppercase text-[9px] tracking-widest px-3 py-1">
                 Live Performance Active
               </Badge>
              <Link to="/analytics" className="text-primary hover:text-primary/80 flex items-center gap-2 transition-all group/link font-black uppercase text-[10px] tracking-widest hover:translate-x-1 bg-primary/10 px-4 py-2 rounded-xl border border-primary/20">
                View Analysis
                <ArrowRight className="h-3 w-3 group-hover/link:translate-x-1 transition-transform" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quadrant Balances & Active Plans Summary */}
        <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
          <Card className="v56-glass border-white/5 p-4 flex flex-col justify-center group hover:border-primary/30 transition-all">
             <div className="flex justify-between items-start">
               <div>
                 <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground mb-1">ROI Balance</p>
                 <p className="text-xl font-black text-primary tabular-nums">${(balances?.roi || 0).toFixed(2)}</p>
               </div>
               <div className="p-2 rounded-lg bg-primary/10">
                 <Gold3DIcon name="roi" size={20} />
               </div>
             </div>
             {investments.filter(inv => inv.status === 'active').length > 0 && (
               <div className="mt-3 pt-2 border-t border-white/5">
                 <p className="text-[8px] uppercase font-bold text-muted-foreground mb-1">Incoming ROI</p>
                 <div className="flex items-center gap-2">
                   <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                     <div className="h-full bg-primary animate-pulse" style={{ width: '60%' }} />
                   </div>
                   <span className="text-[8px] font-black text-primary">LIVE</span>
                 </div>
               </div>
             )}
          </Card>
          <Card className="v56-glass border-white/5 p-4 flex flex-col justify-center group hover:border-blue-500/30 transition-all">
             <div className="flex justify-between items-start">
               <div>
                 <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground mb-1">Deposit Wallet</p>
                 <p className="text-xl font-black text-foreground tabular-nums">${(balances?.deposit || 0).toFixed(2)}</p>
               </div>
               <div className="p-2 rounded-lg bg-blue-500/10">
                 <ArrowDownToLine className="h-4 w-4 text-blue-400" />
               </div>
             </div>
          </Card>
          <Card className="v56-glass border-white/5 p-4 flex flex-col justify-center group hover:border-green-500/30 transition-all">
             <div className="flex justify-between items-start">
               <div>
                 <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground mb-1">Invested Funds</p>
                 <p className="text-xl font-black text-green-500 tabular-nums">${(balances?.invested || 0).toFixed(2)}</p>
               </div>
               <div className="p-2 rounded-lg bg-green-500/10">
                 <Activity className="h-4 w-4 text-green-400" />
               </div>
             </div>
             <p className="mt-2 text-[8px] text-muted-foreground font-medium uppercase tracking-widest">
                {investments.filter(inv => inv.status === 'active').length} Active Plans
             </p>
          </Card>
          <Card className="v56-glass border-white/5 p-4 flex flex-col justify-center group hover:border-red-500/30 transition-all">
             <div className="flex justify-between items-start">
               <div>
                 <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground mb-1">Withdrawable</p>
                 <p className="text-xl font-black text-foreground tabular-nums">${(balances?.withdrawal || 0).toFixed(2)}</p>
               </div>
               <div className="p-2 rounded-lg bg-red-500/10">
                 <ArrowUpFromLine className="h-4 w-4 text-red-400" />
               </div>
             </div>
          </Card>
        </div>
      </div>

      {/* Active Plans Section - Integrated into Portfolio Overview */}
      {investments.filter(inv => inv.status === 'active').length > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              My Active <span className="text-primary">Plans</span>
            </h2>
            <Link to="/invest" className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline">
              Add New Plan
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {investments.filter(inv => inv.status === 'active').map((inv: any) => (
              <Card key={inv.id} className="v56-glass premium-border bg-primary/5 p-4 space-y-4 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Gold3DIcon name="roi" size={40} />
                </div>
                
                <div className="space-y-1 relative z-10">
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">
                      {inv.investment_options?.option_name}
                    </p>
                    <Badge variant="outline" className="text-[8px] bg-green-500/10 text-green-500 border-green-500/20">ACTIVE</Badge>
                  </div>
                  <p className="text-lg font-black text-white">${Number(inv.amount).toLocaleString()} <span className="text-[10px] opacity-60">USDT</span></p>
                </div>

                <div className="space-y-3 relative z-10">
                  <PlanROITimer 
                    selectionId={inv.id} 
                    lastPayoutAt={inv.last_roi_payout_at || inv.selected_at} 
                    frequency={inv.investment_options?.roi_payout_frequency}
                    onPayoutComplete={loadData}
                  />
                  
                  <div className="flex justify-between items-center py-2 px-3 bg-white/5 rounded-lg border border-white/5">
                    <span className="text-[9px] uppercase font-black text-muted-foreground">ROI Earned</span>
                    <span className="text-sm font-black text-green-500 tabular-nums">+${(inv.total_roi_earned || 0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 relative z-10 flex flex-col gap-2">
                   <div className="flex justify-between items-center">
                      <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">
                        Started: {new Date(inv.selected_at).toLocaleDateString()}
                      </p>
                      <Trash2 className="h-3 w-3 text-red-500/40 hover:text-red-500 cursor-pointer" onClick={() => handleDeleteInvestment(inv.id)} />
                   </div>
                   {inv.investment_options && (
                    <CountdownTimer 
                      startDate={inv.selected_at} 
                      durationDays={inv.investment_options.duration_days} 
                      durationHours={inv.investment_options.duration_hours} 
                      className="text-[8px] opacity-60"
                    />
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}


      {/* Recent Activity & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <Card className="v56-glass premium-border overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-6">
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  {t('dashboard.recent_activity')}
                </CardTitle>
                <CardDescription>{t('dashboard.recent_description')}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="hover:bg-primary/10 hover:text-primary rounded-lg transition-colors" asChild>
                <Link to="/transactions">
                  {t('common.view_all')} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-4">
                  <div className="p-4 rounded-full bg-muted/20">
                    <Activity className="h-10 w-10 opacity-20" />
                  </div>
                  <p>{t('dashboard.no_activity')}</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {transactions.map(tx => (
                    <div key={tx.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 hover:bg-white/[0.02] transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110",
                          tx.status === 'completed' || tx.status === 'approved' 
                            ? "bg-green-500/10 border-green-500/20 text-green-500" 
                            : tx.status === 'rejected' 
                              ? "bg-red-500/10 border-red-500/20 text-red-500"
                              : "bg-yellow-500/10 border-yellow-500/20 text-yellow-500"
                        )}>
                          {tx.transaction_type === 'deposit' ? <ArrowDownToLine className="h-5 w-5" /> : <ArrowUpFromLine className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-sm uppercase tracking-tight">{tx.transaction_type.replace('_', ' ')}</p>
                          <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-lg tabular-nums">${tx.amount.toFixed(2)}</p>
                        <p className={cn(
                          "text-[10px] uppercase font-black tracking-widest",
                          tx.status === 'completed' || tx.status === 'approved' ? "text-green-500" : tx.status === 'rejected' ? "text-red-500" : "text-yellow-500"
                        )}>
                          {t(`common.${tx.status}`)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-8">
          {/* Active Investments Summary */}
          <Card className="v56-glass premium-border overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-white/5">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Diamond className="h-5 w-5 text-primary" />
                Active Investments
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {investments.length === 0 ? (
                <div className="text-center py-6 space-y-3">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">No Active Plans</p>
                  <Button size="sm" variant="outline" className="h-8 rounded-lg border-primary/20 text-primary" asChild>
                    <Link to="/invest">Start Investing</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {investments.slice(0, 3).map((inv: any) => (
                    <div key={inv.id} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-black uppercase text-primary tracking-widest leading-none mb-1">
                            {inv.investment_options?.option_name}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm">${Number(inv.amount).toLocaleString()} <span className="text-[8px] text-muted-foreground">USDT</span></p>
                            <Badge 
                              variant="outline" 
                              className={`text-[7px] uppercase font-black border-none px-1 h-3 ${
                                inv.status === 'active' ? 'bg-green-500/10 text-green-500' : 
                                inv.status === 'completed' ? 'bg-blue-500/10 text-blue-500' : 
                                'bg-yellow-500/10 text-yellow-500'
                              }`}
                            >
                              {inv.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] uppercase font-bold text-muted-foreground mb-0.5">
                            {inv.status === 'completed' ? 'TOTAL PROFIT' : 'EST. DAILY'}
                          </p>
                          <p className="text-xs font-black text-green-500 italic">
                            {inv.status === 'completed' 
                              ? `+$${(inv.amount * (inv.investment_options?.roi_percentage / 100)).toFixed(2)}` 
                              : `+$${(inv.amount * (inv.investment_options?.interest_rate / 100 / 30)).toFixed(2)}`
                            }
                          </p>
                        </div>
                      </div>
                      {inv.status === 'completed' && (
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-green-500">
                            <ShieldCheck className="h-3 w-3" />
                            Plan Finished
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            onClick={() => handleDeleteInvestment(inv.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {investments.length > 3 && (
                    <Button variant="ghost" size="sm" className="w-full h-8 text-[10px] font-bold uppercase tracking-widest opacity-60" asChild>
                      <Link to="/invest">View All {investments.length} Plans</Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="v56-glass premium-border h-fit">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {t('dashboard.referral_code')}
              </CardTitle>
              <CardDescription>{t('dashboard.recent_description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent border border-primary/20 relative overflow-hidden group">
                <Users className="absolute -bottom-4 -right-4 h-24 w-24 text-primary opacity-5 group-hover:opacity-10 transition-opacity" />
                <p className="text-xs font-black uppercase tracking-widest text-primary mb-1">{t('dashboard.referral_code')}</p>
                <div className="flex items-center justify-between">
                  <code className="text-2xl font-black font-mono tracking-tighter text-glow">{profile?.referral_code}</code>
                  <Button size="icon" variant="ghost" className="hover:bg-primary/20" onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/signup?ref=${profile?.referral_code}`);
                    toast.success("Link copied to clipboard!");
                  }}>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{t('dashboard.member_level', { level: 1 })} Partners</span>
                  <span className="font-bold">{t('common.active')}</span>
                </div>
                <Button className="w-full  h-12 font-bold" asChild>
                  <Link to="/referrals">{t('dashboard.manage_network')}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
