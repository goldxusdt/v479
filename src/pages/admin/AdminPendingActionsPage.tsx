import { 
  ArrowLeft, 
  RefreshCw, 
  ArrowRight, 
  DollarSign, 
  ArrowUpFromLine, 
  Ticket as TicketIcon,
  User,
  Clock,
  ExternalLink
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/services/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/utils/utils';

export default function AdminPendingActionsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
  const [pendingTickets, setPendingTickets] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [depositsRes, withdrawalsRes, ticketsRes] = await Promise.all([
        supabase
          .from('deposits')
          .select('*, profiles!deposits_user_id_fkey(email, full_name), investment_options!deposits_plan_id_fkey(option_name)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('withdrawals')
          .select('*, profiles!withdrawals_user_id_fkey(email, full_name), user_investment_selections!withdrawals_investment_selection_id_fkey(investment_options(option_name))')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('support_tickets')
          .select('*, profiles!support_tickets_user_id_fkey(email, full_name)')
          .in('status', ['open', 'in_progress'])
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      if (depositsRes.error) throw depositsRes.error;
      if (withdrawalsRes.error) throw withdrawalsRes.error;
      if (ticketsRes.error) throw ticketsRes.error;

      setPendingDeposits(depositsRes.data || []);
      setPendingWithdrawals(withdrawalsRes.data || []);
      setPendingTickets(ticketsRes.data || []);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load pending actions:', error);
      toast.error('Failed to load pending data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalPending = pendingDeposits.length + pendingWithdrawals.length + pendingTickets.length;

  return (
    <div className="p-4 sm:p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-black v56-gradient-text tracking-tighter uppercase italic">Pending <span className="text-foreground">Actions</span></h1>
          </div>
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground opacity-70 ml-10">Centralized Oversight of Outstanding Tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right mr-4 hidden sm:block">
            <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground opacity-60">Total Pending</p>
            <p className="text-xl font-black text-primary italic leading-none">{totalPending}</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadData} className="v56-glass border-white/10 uppercase font-black text-[10px] tracking-widest h-10 px-4" disabled={loading}>
            <RefreshCw className={cn("mr-2 h-3 w-3", loading && "animate-spin")} />
            Refresh All
          </Button>
        </div>
      </div>

      <div className="text-[10px] uppercase font-bold text-muted-foreground opacity-60">
        Last centralized refresh: {format(lastRefresh, 'HH:mm:ss')}
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Pending Deposits */}
        <Card className="v56-glass premium-border overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                <CardTitle className="text-lg font-black uppercase italic tracking-tighter">Pending Deposits</CardTitle>
                <span className="bg-green-500/20 text-green-500 text-[10px] px-2 py-0.5 rounded-full font-black tracking-widest">{pendingDeposits.length}</span>
              </div>
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest opacity-60">Awaiting Transaction Hash Verification</CardDescription>
            </div>
            <Button size="sm" variant="ghost" className="text-[10px] uppercase font-black tracking-widest text-primary hover:bg-primary/10" asChild>
              <Link to="/admin/deposits?filter=pending">
                View All <ArrowRight className="ml-2 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {pendingDeposits.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground uppercase text-xs font-bold tracking-widest opacity-40">No pending deposits</div>
            ) : (
              <div className="divide-y divide-white/5">
                {pendingDeposits.map((d) => (
                  <div key={d.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-white/5 transition-colors">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-primary opacity-60" />
                        <span className="font-bold text-sm italic">{d.profiles?.email}</span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                        <span>Plan: <span className="text-primary">{d.investment_options?.option_name || 'DIRECT'}</span></span>
                        <span>Amount: <span className="text-foreground">${d.amount.toFixed(2)}</span></span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {format(new Date(d.created_at), 'MMM d, HH:mm')}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="h-8 text-[9px] uppercase font-black tracking-widest border-white/10" asChild>
                      <Link to="/admin/deposits">Verify <ExternalLink className="ml-2 h-3 w-3" /></Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Withdrawals */}
        <Card className="v56-glass premium-border overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ArrowUpFromLine className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-lg font-black uppercase italic tracking-tighter">Withdrawal Requests</CardTitle>
                <span className="bg-orange-500/20 text-orange-500 text-[10px] px-2 py-0.5 rounded-full font-black tracking-widest">{pendingWithdrawals.length}</span>
              </div>
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest opacity-60">Payouts Requiring Administrative Approval</CardDescription>
            </div>
            <Button size="sm" variant="ghost" className="text-[10px] uppercase font-black tracking-widest text-primary hover:bg-primary/10" asChild>
              <Link to="/admin/withdrawals?filter=pending">
                View All <ArrowRight className="ml-2 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {pendingWithdrawals.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground uppercase text-xs font-bold tracking-widest opacity-40">No pending withdrawals</div>
            ) : (
              <div className="divide-y divide-white/5">
                {pendingWithdrawals.map((w) => (
                  <div key={w.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-white/5 transition-colors">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-primary opacity-60" />
                        <span className="font-bold text-sm italic">{w.profiles?.email}</span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                        <span>Net: <span className="text-green-500">${w.net_amount.toFixed(2)}</span></span>
                        <span>Wallet: <span className="text-foreground truncate max-w-[100px]">{w.wallet_address}</span></span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {format(new Date(w.created_at), 'MMM d, HH:mm')}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="h-8 text-[9px] uppercase font-black tracking-widest border-white/10" asChild>
                      <Link to="/admin/withdrawals">Process <ExternalLink className="ml-2 h-3 w-3" /></Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Tickets */}
        <Card className="v56-glass premium-border overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <TicketIcon className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-lg font-black uppercase italic tracking-tighter">Support Tickets</CardTitle>
                <span className="bg-blue-500/20 text-blue-500 text-[10px] px-2 py-0.5 rounded-full font-black tracking-widest">{pendingTickets.length}</span>
              </div>
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest opacity-60">Active User Conversations Awaiting Response</CardDescription>
            </div>
            <Button size="sm" variant="ghost" className="text-[10px] uppercase font-black tracking-widest text-primary hover:bg-primary/10" asChild>
              <Link to="/admin/tickets">
                View All <ArrowRight className="ml-2 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {pendingTickets.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground uppercase text-xs font-bold tracking-widest opacity-40">No pending tickets</div>
            ) : (
              <div className="divide-y divide-white/5">
                {pendingTickets.map((t) => (
                  <div key={t.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-white/5 transition-colors">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-primary opacity-60" />
                        <span className="font-bold text-sm italic">{t.profiles?.email || t.guest_email || 'Guest'}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[8px] uppercase font-black tracking-tighter",
                          t.status === 'open' ? "bg-blue-500/20 text-blue-500" : "bg-purple-500/20 text-purple-500"
                        )}>
                          {t.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                        <span>Subject: <span className="text-foreground">{t.subject}</span></span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {format(new Date(t.created_at), 'MMM d, HH:mm')}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="h-8 text-[9px] uppercase font-black tracking-widest border-white/10" asChild>
                      <Link to="/admin/tickets">Reply <ExternalLink className="ml-2 h-3 w-3" /></Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
