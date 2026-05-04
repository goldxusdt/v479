import { 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Ticket, 
  History, 
  BarChart3, 
  PieChart, 
  Activity, 
  Download, 
  ArrowRight,
  RefreshCw, 
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/services/supabase';
import { getAdminAnalytics } from '@/services/api';
import { invokeEdgeFunction } from '@/services/functions';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { toast } from 'sonner';
import { ActivityFeed } from '@/components/admin/ActivityFeed';
import { SystemDiagnostic } from '@/components/admin/SystemDiagnostic';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/utils';
import { format } from 'date-fns';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalFees: 0,
    activeCoupons: 0,
    nonKycUsers: 0,
    completeKycUsers: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    pendingKYC: 0,
    totalActiveInvestments: 0
  });

  const [analytics, setAnalytics] = useState<any>(null);
  const [pendingRefunds, setPendingRefunds] = useState<any[]>([]);
  const [kycCatalog, setKycCatalog] = useState<any[]>([]);
  const [processingRefundId, setProcessingRefundId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    loadKycCatalog();

    // Use a single timer for debouncing stat reloads
    let debounceTimer: NodeJS.Timeout;
    const debouncedReload = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadStats();
        loadAnalytics();
      }, 2000); // 2 second debounce to prevent rapid fire
    };

    // Real-time subscriptions for dashboard stats
    const depositsChannel = supabase
      .channel('admin_dashboard_deposits')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deposits' }, debouncedReload)
      .subscribe();

    const withdrawalsChannel = supabase
      .channel('admin_dashboard_withdrawals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals' }, debouncedReload)
      .subscribe();

    const usersChannel = supabase
      .channel('admin_dashboard_users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, debouncedReload)
      .subscribe();

    const kycChannel = supabase
      .channel('admin_dashboard_kyc')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: 'kyc_status=neq.approved' }, debouncedReload)
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(depositsChannel);
      supabase.removeChannel(withdrawalsChannel);
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(kycChannel);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadStats(), loadAnalytics(), loadPendingRefunds()]);
    setLoading(false);
  };

  const loadPendingRefunds = async () => {
    try {
      const { data, error } = await (supabase as any).rpc('get_pending_refunds');
      if (error) throw error;
      setPendingRefunds(data || []);
    } catch (error) {
      console.error('Failed to load pending refunds:', error);
    }
  };

  const handleProcessRefund = async (refund: any) => {
    if (!window.confirm(`Confirm withdrawal completion for ${refund.user_name} - ${refund.fund_value} USDT?`)) {
      return;
    }

    const { data: { user: adminUser } } = await supabase.auth.getUser();
    if (!adminUser) return;

    setProcessingRefundId(refund.id);
    try {
      const { data, error } = await (supabase as any).rpc('process_refund', {
        p_investment_id: refund.id,
        p_admin_id: adminUser.id
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.message);

      toast.success(`Withdrawal completed successfully for ${refund.user_name}`);
      
      // Notifications (Email & Web Push)
      try {
        await invokeEdgeFunction('send-push-notification', {
          body: {
            target_type: 'individual',
            target_id: refund.user_id,
            category: 'withdrawal_complete',
            title: 'Withdrawal Complete ✅',
            body: `Your withdrawal of ${refund.fund_value} USDT is complete and your funds have been sent.`,
            action_url: '/transactions'
          }
        });

        await invokeEdgeFunction('send-withdrawal-complete-email', {
          body: {
            email: refund.email,
            amount: refund.fund_value,
            userName: refund.user_name,
            planName: refund.plan_name
          }
        });
      } catch (e) {
        console.warn('Notifications failed:', e);
      }

      // Reload data
      loadData();
    } catch (error: unknown) {
      console.error('Failed to process refund:', error);
      toast.error((error as any).message || 'Failed to process refund');
    } finally {
      setProcessingRefundId(null);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await (supabase as any).rpc('get_admin_stats');
      if (error) throw error;

      // Fetch active investments sum
      const { data: invData } = await supabase
        .from('user_investment_selections')
        .select('amount')
        .eq('is_active', true);
      
      const totalInv = (invData || []).reduce((sum: number, inv: any) => sum + Number(inv.amount), 0);

      if (data) {
        setStats(prev => ({
          ...prev,
          ...(data as any),
          totalActiveInvestments: totalInv
        }));
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const { data, error } = await getAdminAnalytics();
      if (error) throw error;
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics data');
    }
  };

  const loadKycCatalog = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, email, kyc_document_type, kyc_status, created_at')
        .neq('kyc_status', 'not_submitted')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setKycCatalog(data || []);
    } catch (error) {
      console.error('Failed to load KYC catalog:', error);
    }
  };

  const handleRefresh = () => {
    loadData();
    toast.success('Dashboard data refreshed');
  };

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black v56-gradient-text tracking-tighter uppercase italic">Admin <span className="text-foreground">Dashboard</span></h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground opacity-70">Strategic Analytics & Operations Control</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} className="v56-glass border-white/10 uppercase font-black text-[10px] tracking-widest h-10 px-4">
            <RefreshCw className="mr-2 h-3 w-3" />
            Refresh
          </Button>
          <Button size="sm" className="premium-gradient uppercase font-black text-[10px] tracking-widest h-10 px-4">
            <Download className="mr-2 h-3 w-3" />
            Export Report
          </Button>
        </div>
      </div>

      {/* High Level Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
        <Card className="v56-glass premium-border overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="h-10 w-10 text-primary" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-[9px] uppercase font-black tracking-widest">Active Volume</CardDescription>
            <CardTitle className="text-xl font-black italic tracking-tighter text-primary">
              ${analytics?.total_stats?.total_active_volume?.toLocaleString() || '0'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-[9px] font-bold text-green-500 uppercase tracking-widest">
              <ArrowUpRight className="h-3 w-3" />
              Live Capital
            </div>
          </CardContent>
        </Card>

        <Card className="v56-glass premium-border overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign className="h-10 w-10 text-green-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-[9px] uppercase font-black tracking-widest">Fees Collected</CardDescription>
            <CardTitle className="text-xl font-black italic tracking-tighter text-green-500">
              ${stats.totalFees.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-[9px] font-bold text-blue-500 uppercase tracking-widest">
              <Activity className="h-3 w-3" />
              Cumulative Revenue
            </div>
          </CardContent>
        </Card>

        <Card className="v56-glass premium-border overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ArrowUpRight className="h-10 w-10 text-destructive" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-[9px] uppercase font-black tracking-widest">Total Withdrawals</CardDescription>
            <CardTitle className="text-xl font-black italic tracking-tighter text-destructive">
              ${stats.totalWithdrawals.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-[9px] font-bold text-orange-500 uppercase tracking-widest">
              <History className="h-3 w-3" />
              Processed Funds
            </div>
          </CardContent>
        </Card>

        <Card className="v56-glass premium-border overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users className="h-10 w-10 text-blue-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-[9px] uppercase font-black tracking-widest">Total Users</CardDescription>
            <CardTitle className="text-xl font-black italic tracking-tighter text-blue-500">
              {stats.totalUsers}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-[9px] font-bold text-primary uppercase tracking-widest">
              <Users className="h-3 w-3" />
              Registered
            </div>
          </CardContent>
        </Card>

        <Card className="v56-glass premium-border overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock className="h-10 w-10 text-yellow-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-[9px] uppercase font-black tracking-widest">Pending Refunds</CardDescription>
            <CardTitle className="text-xl font-black italic tracking-tighter text-yellow-500">
              {pendingRefunds.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-[9px] font-bold text-orange-500 uppercase tracking-widest">
              <AlertCircle className="h-3 w-3" />
              Due Today
            </div>
          </CardContent>
        </Card>

        <Card 
          className="v56-glass premium-border overflow-hidden relative group cursor-pointer hover:border-primary/50 transition-all"
          onClick={() => navigate('/admin/pending-actions')}
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="h-10 w-10 text-white" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-[9px] uppercase font-black tracking-widest">Review Actions</CardDescription>
            <CardTitle className="text-xl font-black italic tracking-tighter text-white">
              {stats.pendingDeposits + stats.pendingWithdrawals + stats.pendingKYC}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-[9px] font-bold text-primary uppercase tracking-widest">
              <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              Take Action
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Refunds Table Section */}
      <Card className="v56-glass premium-border overflow-hidden">
        <CardHeader className="border-b border-white/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black italic tracking-tighter uppercase">Pending Refunds</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest opacity-60 flex items-center gap-2">
                <AlertCircle className="h-3 w-3 text-yellow-500" />
                Investment principal returns due for processing today
              </CardDescription>
            </div>
            <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
              <div className="text-center">
                <p className="text-[8px] uppercase font-bold text-muted-foreground tracking-widest">Count</p>
                <p className="text-lg font-black text-primary leading-tight">{pendingRefunds.length}</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <p className="text-[8px] uppercase font-bold text-muted-foreground tracking-widest">Total Volume</p>
                <p className="text-lg font-black text-green-500 leading-tight">${pendingRefunds.reduce((sum, r) => sum + Number(r.fund_value), 0).toLocaleString()} <span className="text-[10px]">USDT</span></p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase font-black tracking-widest">User Name</TableHead>
                  <TableHead className="text-[10px] uppercase font-black tracking-widest">Plan Name</TableHead>
                  <TableHead className="text-[10px] uppercase font-black tracking-widest">Fund Value</TableHead>
                  <TableHead className="text-[10px] uppercase font-black tracking-widest">Wallet Address</TableHead>
                  <TableHead className="text-[10px] uppercase font-black tracking-widest">Maturity Date</TableHead>
                  <TableHead className="text-[10px] uppercase font-black tracking-widest text-right px-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRefunds.length > 0 ? (
                  pendingRefunds.map((refund) => (
                    <TableRow key={refund.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm tracking-tight">{refund.user_name}</span>
                          <span className="text-[9px] text-muted-foreground lowercase opacity-60">{refund.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="v56-glass border-primary/20 text-primary text-[10px] font-black uppercase tracking-tighter">
                          {refund.plan_name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-black text-green-500 italic tracking-tighter text-sm">${Number(refund.fund_value).toLocaleString()} <span className="text-[9px] not-italic text-muted-foreground">USDT</span></span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 group/wallet cursor-pointer" onClick={() => {
                          navigator.clipboard.writeText(refund.wallet_address);
                          toast.success('Address copied');
                        }}>
                          <code className="text-[10px] bg-white/5 px-2 py-1 rounded border border-white/5 text-muted-foreground group-hover/wallet:text-primary transition-colors">
                            {refund.wallet_address ? `${refund.wallet_address.substring(0, 8)}...${refund.wallet_address.substring(refund.wallet_address.length - 8)}` : 'NOT_SET'}
                          </code>
                          <History className="h-3 w-3 opacity-0 group-hover/wallet:opacity-100 transition-opacity" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-[10px] font-bold text-muted-foreground">{new Date(refund.maturity_date).toLocaleDateString()}</span>
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <Button 
                          size="sm" 
                          variant="outline"
                          disabled={processingRefundId === refund.id}
                          onClick={() => handleProcessRefund(refund)}
                          className="h-8 v56-glass border-green-500/30 text-green-500 hover:bg-green-500 hover:text-white font-black uppercase text-[9px] tracking-widest"
                        >
                          {processingRefundId === refund.id ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          )}
                          Withdrawal Complete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 opacity-50">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No pending refunds for today</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* KYC User Catalog Section */}
      <Card className="v56-glass premium-border overflow-hidden">
        <CardHeader className="border-b border-white/5 bg-white/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black italic tracking-tighter uppercase">KYC User Catalog</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest opacity-60">
                Recent identity submissions and verification status
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/admin/kyc')}
              className="h-9 v56-glass border-primary/20 text-primary hover:bg-primary/10 font-black uppercase text-[9px] tracking-widest"
            >
              View All Submissions
              <ArrowRight className="ml-2 h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase font-black tracking-widest">User</TableHead>
                  <TableHead className="text-[10px] uppercase font-black tracking-widest">Email</TableHead>
                  <TableHead className="text-[10px] uppercase font-black tracking-widest">Document Type</TableHead>
                  <TableHead className="text-[10px] uppercase font-black tracking-widest text-center">Status</TableHead>
                  <TableHead className="text-[10px] uppercase font-black tracking-widest text-right px-6">Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kycCatalog.length > 0 ? (
                  kycCatalog.map((user) => (
                    <TableRow key={user.id} className="border-white/5 hover:bg-white/5">
                      <TableCell>
                        <span className="font-bold text-sm">{user.username}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-[10px] text-muted-foreground">{user.email}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[9px] font-bold uppercase border-primary/20 text-primary">
                          {user.kyc_document_type || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "text-[9px] font-black uppercase tracking-tighter",
                          user.kyc_status === 'approved' ? "bg-green-500/10 text-green-500" :
                          user.kyc_status === 'rejected' ? "bg-destructive/10 text-destructive" :
                          "bg-yellow-500/10 text-yellow-500"
                        )}>
                          {user.kyc_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {format(new Date(user.created_at), 'yyyy-MM-dd')}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-50">No recent KYC submissions</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>


      {/* Analytics Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="v56-glass premium-border">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg font-black uppercase italic tracking-tighter">Investment Volume Trend</CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold tracking-widest opacity-60">Daily Volume (Last 30 Days)</CardDescription>
              </div>
              <BarChart3 className="h-5 w-5 text-primary opacity-50" />
            </div>
          </CardHeader>
          <CardContent className="h-[300px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.daily_trends || []}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="white" strokeOpacity={0.05} />
                <XAxis 
                  dataKey="date" 
                  stroke="white" 
                  strokeOpacity={0.4} 
                  fontSize={9} 
                  tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  stroke="white" 
                  strokeOpacity={0.4} 
                  fontSize={9} 
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#141b2d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '10px', color: '#fff' }}
                  itemStyle={{ color: 'hsl(var(--primary))' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="daily_volume" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorVolume)" 
                  name="Volume"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="v56-glass premium-border">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg font-black uppercase italic tracking-tighter">ROI Payout Trend</CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold tracking-widest opacity-60">Daily Distributed ROI</CardDescription>
              </div>
              <PieChart className="h-5 w-5 text-green-500 opacity-50" />
            </div>
          </CardHeader>
          <CardContent className="h-[300px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.daily_trends || []}>
                <defs>
                  <linearGradient id="colorROI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="white" strokeOpacity={0.05} />
                <XAxis 
                  dataKey="date" 
                  stroke="white" 
                  strokeOpacity={0.4} 
                  fontSize={9} 
                  tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  stroke="white" 
                  strokeOpacity={0.4} 
                  fontSize={9} 
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#141b2d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '10px', color: '#fff' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="daily_roi_paid" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorROI)" 
                  name="ROI Paid"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3">
          <SystemDiagnostic />
        </div>
      </div>

      {/* Lower Section: Plan Performance & Real-time Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="v56-glass premium-border h-full">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase italic tracking-tighter">Investment Plan Performance</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest opacity-60">Comparative breakdown by strategy</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] uppercase tracking-wider">
                  <thead>
                    <tr className="border-b border-white/10 text-muted-foreground font-black">
                      <th className="text-left py-4 px-2">Plan Name</th>
                      <th className="text-right py-4 px-2">Total Invested</th>
                      <th className="text-right py-4 px-2">Active Volume</th>
                      <th className="text-right py-4 px-2">ROI Distributed</th>
                      <th className="text-right py-4 px-2">Active Users</th>
                      <th className="text-right py-4 px-2">Monthly Payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics?.plan_performance?.map((plan: any) => (
                      <tr key={plan.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                        <td className="py-4 px-2 font-black text-primary italic">{plan.option_name}</td>
                        <td className="text-right py-4 px-2 font-bold">${plan.total_invested.toLocaleString()}</td>
                        <td className="text-right py-4 px-2 font-bold text-green-500">${plan.active_invested.toLocaleString()}</td>
                        <td className="text-right py-4 px-2 font-bold text-orange-500">${plan.total_roi_paid.toLocaleString()}</td>
                        <td className="text-right py-4 px-2 font-bold">{plan.active_users}</td>
                        <td className="text-right py-4 px-2">
                          <div className="flex items-center justify-end gap-1 font-black text-primary">
                            ${plan.projected_monthly_payout.toLocaleString()}
                            <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <ActivityFeed />
        </div>
      </div>

      {/* Quick Nav Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { label: 'Users', icon: Users, path: '/admin/users', color: 'primary' },
          { label: 'Deposits', icon: TrendingUp, path: '/admin/deposits', color: 'green-500' },
          { label: 'Withdrawals', icon: DollarSign, path: '/admin/withdrawals', color: 'orange-500' },
          { label: 'History', icon: History, path: '/admin/investment-history', color: 'primary' },
          { label: 'Validations', icon: Ticket, path: '/admin/investment-validations', color: 'primary' },
          { label: 'Security', icon: ShieldCheck, path: '/admin/security-dashboard', color: 'blue-500' },
          { label: 'Audit', icon: History, path: '/admin/audit-logs', color: 'primary' },
        ].map((nav, i) => (
          <Button
            key={i}
            variant="ghost"
            onClick={() => navigate(nav.path)}
            className="v56-glass border border-white/5 h-24 flex flex-col gap-2 rounded-2xl hover:border-white/20 transition-all hover:scale-105"
          >
            <nav.icon className={`h-6 w-6 text-${nav.color}`} />
            <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{nav.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}


