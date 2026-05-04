import { RefreshCw, Search, Filter, Calendar, User, Hash, Download } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/services/supabase';
import { getPlatformSetting, rejectDeposit } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { invokeEdgeFunction } from '@/services/functions';
import { exportToCSV } from '@/utils/csv-export';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

import type { Deposit } from '@/types';

export default function AdminDepositsPage() {
  const { user } = useAuth();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLiveRefresh, setIsLiveRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadDeposits = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      let query = supabase.from('deposits').select('*, profiles!deposits_user_id_fkey(email, full_name), investment_options!deposits_plan_id_fkey(option_name), coupons!deposits_coupon_id_fkey(code)');
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setDeposits(data || []);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load deposits:', error);
      toast.error('Failed to load deposits');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadDeposits();

    // Real-time subscription for deposits
    const channel = supabase
      .channel('admin_deposits_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deposits' },
        () => {
          loadDeposits(false);
        }
      )
      .subscribe();

    let interval: NodeJS.Timeout;
    if (isLiveRefresh) {
      interval = setInterval(() => {
        loadDeposits(false);
      }, 30000);
    }

    return () => {
      supabase.removeChannel(channel);
      if (interval) clearInterval(interval);
    };
  }, [loadDeposits, isLiveRefresh, statusFilter]);

  const handleApprove = async (depositId: string) => {
    if (!user || verifying) return;
    
    setVerifying(depositId);
    try {
      const { error } = await supabase.rpc('process_deposit_approval', {
        deposit_id_param: depositId,
        admin_id: user.id
      } as any);

      if (error) throw error;
      
      toast.success('Deposit approved successfully');
      loadDeposits();
    } catch (error: unknown) {
      console.error('Failed to approve deposit:', error);
      toast.error((error as any)?.message || 'Failed to approve deposit');
    } finally {
      setVerifying(null);
    }
  };

  const handleReject = async (depositId: string) => {
    try {
      const { error } = await rejectDeposit(depositId, 'Rejected by admin');

      if (error) throw error;
      toast.success('Deposit rejected');
      loadDeposits();
    } catch (error) {
      console.error('Failed to reject deposit:', error);
      toast.error('Failed to reject deposit');
    }
  };

  const handleVerify = async (deposit: Deposit) => {
    setVerifying(deposit.id);
    try {
      const walletKey = deposit.network === 'BEP20' ? 'deposit_wallet_bep20' : 'deposit_wallet_trc20';
      const walletAddress = await getPlatformSetting(walletKey);

      if (!walletAddress) {
        toast.error('Platform wallet address not configured in settings');
        return;
      }

      toast.info('Verifying transaction on blockchain...');

      const { data, error } = await invokeEdgeFunction('verify-transaction', {
        body: {
          transactionHash: deposit.transaction_hash,
          network: deposit.network,
          expectedAddress: walletAddress,
          expectedAmount: deposit.amount
        }
      });

      if (error) {
        toast.error(`Verification failed: ${(error as any).message}`);
        return;
      }

      if (data?.verified) {
        toast.success(`Transaction verified! Amount: ${data.actualAmount} USDT`);
        await handleApprove(deposit.id);
      } else {
        toast.error(data?.error || 'Transaction could not be verified');
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Failed to verify transaction');
    } finally {
      setVerifying(null);
    }
  };

  const handleExportCSV = () => {
    const exportData = filteredDeposits.map(d => ({
      'Transaction ID': d.transaction_id,
      'User Email': (d as any).profiles?.email,
      'User Name': (d as any).profiles?.full_name,
      'Plan Name': (d as any).investment_options?.option_name || 'Direct Deposit',
      'Amount (USDT)': d.amount,
      'Fee (USDT)': d.fee,
      'Coupon Applied': d.coupon_id ? (d as any).coupons?.code || 'Yes' : 'No',
      'Coupon Bonus (USDT)': d.coupon_bonus || 0,
      'Net Amount (USDT)': d.net_amount,
      'Network': d.network,
      'Hash': d.transaction_hash,
      'Status': d.status,
      'Date': format(new Date(d.created_at), 'dd/MM/yyyy hh:mm a')
    }));
    exportToCSV(exportData, 'deposits');
    toast.success('Deposits exported to CSV');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text('Deposit Management Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy hh:mm a')}`, 14, 22);
    
    const tableData = filteredDeposits.map(d => [
      (d as any).profiles?.email,
      (d as any).investment_options?.option_name || 'Direct',
      `${d.amount.toFixed(2)}`,
      d.status,
      format(new Date(d.created_at), 'dd/MM/yyyy')
    ]);

    autoTable(doc, {
      head: [['Email', 'Plan', 'Amount', 'Status', 'Date']],
      body: tableData,
      startY: 30,
    });

    doc.save(`deposits_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
    toast.success('Deposits exported to PDF');
  };

  const filteredDeposits = deposits.filter(d =>
    (d as any).profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d as any).profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.transaction_hash?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold v56-gradient-text">Deposit Management</h1>
          <p className="text-muted-foreground">Review and approve user deposits</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadDeposits()} 
            className="v56-glass border-white/10 uppercase font-black text-[10px] tracking-widest h-10 px-4"
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            Manual Refresh
          </Button>
          <Button 
            variant={isLiveRefresh ? "default" : "outline"} 
            size="sm" 
            onClick={() => setIsLiveRefresh(!isLiveRefresh)} 
            className="v56-glass border-white/10 uppercase font-black text-[10px] tracking-widest h-10 px-4"
          >
            <RefreshCw className={`mr-2 h-3 w-3 ${isLiveRefresh ? 'animate-pulse text-green-500' : ''}`} />
            {isLiveRefresh ? 'Live Refresh ON' : 'Live Refresh OFF'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportCSV} 
            className="v56-glass border-white/10 uppercase font-black text-[10px] tracking-widest h-10 px-4"
          >
            <Download className="mr-2 h-3 w-3" />
            CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportPDF} 
            className="v56-glass border-white/10 uppercase font-black text-[10px] tracking-widest h-10 px-4"
          >
            <Download className="mr-2 h-3 w-3" />
            PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search email, name, or hash..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px] h-10">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="text-[10px] uppercase font-bold text-muted-foreground opacity-60">
        Last update: {format(lastRefresh, 'HH:mm:ss')}
      </div>

      <Card className="v56-glass premium-border">
        <CardHeader>
          <CardTitle className="text-lg font-black uppercase italic tracking-tighter">Deposit Submissions ({filteredDeposits.length})</CardTitle>
          <CardDescription className="text-[10px] uppercase font-bold tracking-widest">Verify hashes and credit wallets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading && deposits.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center gap-4">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs uppercase font-bold tracking-widest">Loading deposits...</p>
              </div>
            ) : filteredDeposits.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground uppercase text-xs font-bold tracking-widest">No deposits found.</div>
            ) : (
              filteredDeposits.map((d) => (
                <div key={d.id} className="p-4 border border-primary/10 rounded-xl hover:border-primary/40 transition-all bg-primary/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{(d as any).profiles?.email}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{(d as any).profiles?.full_name || 'No Name'}</span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[9px] uppercase font-black tracking-widest ${
                        d.status === 'approved' ? 'bg-green-500/20 text-green-500 border border-green-500/30' :
                        d.status === 'rejected' ? 'bg-red-500/20 text-red-500 border border-red-500/30' :
                        'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 shadow-glow-sm'
                      }`}>
                        {d.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest opacity-60">Plan</span>
                        <span className="text-xs font-black text-primary italic">{(d as any).investment_options?.option_name || 'DIRECT'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest opacity-60">Amount</span>
                        <span className="text-xs font-black tabular-nums">{d.amount.toFixed(2)} USDT</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest opacity-60">Fee</span>
                        <span className="text-xs font-black tabular-nums text-red-400">-{d.fee.toFixed(2)} USDT</span>
                      </div>
                      {(d as any).coupons?.code && (
                        <div className="flex flex-col">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest opacity-60">Coupon</span>
                          <span className="text-xs font-black tabular-nums text-primary">{(d as any).coupons.code}</span>
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest opacity-60">Net</span>
                        <span className="text-xs font-black tabular-nums text-green-500">${d.net_amount.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest opacity-60">Network</span>
                        <span className="text-xs font-black text-blue-500">{d.network}</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-4 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 opacity-50" />
                        {new Date(d.created_at).toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <Hash className="h-3 w-3 opacity-50" />
                        <span className="font-mono text-primary/60 truncate italic">{d.transaction_hash}</span>
                      </div>
                    </div>
                  </div>
                  {d.status === 'pending' && (
                    <div className="flex gap-2 w-full md:w-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVerify(d)}
                        disabled={verifying === d.id}
                        className="v56-glass border-white/10 uppercase font-black text-[10px] tracking-widest h-9 px-4 flex-1 md:flex-none"
                      >
                        {verifying === d.id ? (
                          <RefreshCw className="h-3 w-3 animate-spin mr-2" />
                        ) : (
                          <RefreshCw className="h-3 w-3 mr-2" />
                        )}
                        Verify
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleApprove(d.id)} 
                        disabled={verifying === d.id}
                        className="premium-gradient uppercase font-black text-[10px] tracking-widest h-9 px-4 flex-1 md:flex-none"
                      >
                        {verifying === d.id ? 'Processing...' : 'Approve'}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(d.id)} className="uppercase font-black text-[10px] tracking-widest h-9 px-4 flex-1 md:flex-none">Reject</Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
