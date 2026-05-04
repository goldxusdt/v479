import { Filter, Search, Calendar, User, Download, RefreshCw } from 'lucide-react';
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
import { useAuth } from '@/contexts/AuthContext';
import { exportToCSV } from '@/utils/csv-export';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

import type { Withdrawal } from '@/types';

export default function AdminWithdrawalsPage() {
  const { profile: adminProfile } = useAuth();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLiveRefresh, setIsLiveRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadWithdrawals = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      let query = supabase.from('withdrawals').select(`
        *, 
        profiles!withdrawals_user_id_fkey(email, full_name),
        user_investment_selections!withdrawals_investment_selection_id_fkey(
          investment_options(option_name)
        ),
        coupons!withdrawals_coupon_id_fkey(code)
      `);
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setWithdrawals(data || []);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load withdrawals:', error);
      toast.error('Failed to load withdrawals');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadWithdrawals();

    // Real-time subscription for withdrawals
    const channel = supabase
      .channel('admin_withdrawals_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'withdrawals' },
        () => {
          loadWithdrawals(false);
        }
      )
      .subscribe();

    let interval: NodeJS.Timeout;
    if (isLiveRefresh) {
      interval = setInterval(() => {
        loadWithdrawals(false);
      }, 30000);
    }

    return () => {
      supabase.removeChannel(channel);
      if (interval) clearInterval(interval);
    };
  }, [loadWithdrawals, isLiveRefresh, statusFilter]);

  const handleProcess = async (withdrawalId: string, approved: boolean) => {
    if (!adminProfile) return;
    
    try {
      const { error } = await supabase.rpc('process_withdrawal_approval', {
        p_withdrawal_id: withdrawalId,
        p_admin_id: adminProfile.id,
        p_approved: approved,
        p_notes: approved ? 'Approved by admin' : 'Rejected by admin'
      } as any);

      if (error) throw error;
      toast.success(`Withdrawal ${approved ? 'approved' : 'rejected'} successfully`);
      loadWithdrawals();
    } catch (error: unknown) {
      console.error('Failed to process withdrawal:', error);
      toast.error((error as any).message || 'Failed to process withdrawal');
    }
  };

  const handleExportCSV = () => {
    const exportData = filteredWithdrawals.map(w => ({
      'Request ID': w.id,
      'User Email': (w as any).profiles?.email,
      'User Name': (w as any).profiles?.full_name,
      'Plan Name': (w as any).user_investment_selections?.investment_options?.option_name || 'Direct Withdrawal',
      'Amount (USDT)': w.amount,
      'Fee (USDT)': w.fee,
      'Coupon Applied': w.coupon_id ? (w as any).coupons?.code || 'Yes' : 'No',
      'Coupon Discount (USDT)': w.coupon_discount || 0,
      'Net Amount (USDT)': w.net_amount,
      'Network': w.network,
      'Target Wallet': w.wallet_address,
      'Status': w.status,
      'Date': format(new Date(w.created_at), 'dd/MM/yyyy hh:mm a')
    }));
    exportToCSV(exportData, 'withdrawals');
    toast.success('Withdrawals exported to CSV');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text('Withdrawal Management Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy hh:mm a')}`, 14, 22);
    
    const tableData = filteredWithdrawals.map(w => [
      (w as any).profiles?.email,
      (w as any).user_investment_selections?.investment_options?.option_name || 'Direct',
      `${w.amount.toFixed(2)}`,
      w.status,
      format(new Date(w.created_at), 'dd/MM/yyyy')
    ]);

    autoTable(doc, {
      head: [['Email', 'Plan', 'Amount', 'Status', 'Date']],
      body: tableData,
      startY: 30,
    });

    doc.save(`withdrawals_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
    toast.success('Withdrawals exported to PDF');
  };

  const filteredWithdrawals = withdrawals.filter(w =>
    (w as any).profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (w as any).profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.wallet_address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold v56-gradient-text">Withdrawal Management</h1>
          <p className="text-muted-foreground">Review and process withdrawal requests</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadWithdrawals()} 
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
            placeholder="Search email, name, or wallet..."
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
          <CardTitle className="text-lg font-black uppercase italic tracking-tighter">Withdrawal Requests ({filteredWithdrawals.length})</CardTitle>
          <CardDescription className="text-[10px] uppercase font-bold tracking-widest">Review user payouts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading && withdrawals.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center gap-4">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs uppercase font-bold tracking-widest">Loading requests...</p>
              </div>
            ) : filteredWithdrawals.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground uppercase text-xs font-bold tracking-widest">No withdrawal requests found.</div>
            ) : (
              filteredWithdrawals.map((w) => (
                <div key={w.id} className="p-4 border border-primary/10 rounded-xl hover:border-primary/40 transition-all bg-primary/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{(w as any).profiles?.email}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{(w as any).profiles?.full_name || 'No Name'}</span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[9px] uppercase font-black tracking-widest ${
                        w.status === 'approved' ? 'bg-green-500/20 text-green-500 border border-green-500/30' :
                        w.status === 'rejected' ? 'bg-red-500/20 text-red-500 border border-red-500/30' :
                        'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 shadow-glow-sm'
                      }`}>
                        {w.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest opacity-60">Source</span>
                        <span className="text-xs font-black text-primary italic">{(w as any).user_investment_selections?.investment_options?.option_name || 'DIRECT'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest opacity-60">Amount</span>
                        <span className="text-xs font-black tabular-nums">{w.amount.toFixed(2)} USDT</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest opacity-60">Fee</span>
                        <span className="text-xs font-black tabular-nums text-red-400">-{w.fee.toFixed(2)} USDT</span>
                      </div>
                      {(w as any).coupons?.code && (
                        <div className="flex flex-col">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest opacity-60">Coupon</span>
                          <span className="text-xs font-black tabular-nums text-primary">{(w as any).coupons.code}</span>
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest opacity-60">Net</span>
                        <span className="text-xs font-black tabular-nums text-green-500">${w.net_amount.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest opacity-60">Wallet</span>
                        <span className="text-xs font-black text-blue-500 flex items-center gap-1">
                          <span className="font-mono text-[10px] truncate max-w-[150px]">{w.wallet_address}</span>
                          <span className="opacity-60">({w.network})</span>
                        </span>
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-4 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 opacity-50" />
                        {new Date(w.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    {w.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => handleProcess(w.id, true)} className="premium-gradient uppercase font-black text-[10px] tracking-widest h-9 px-4 flex-1 md:flex-none">Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleProcess(w.id, false)} className="uppercase font-black text-[10px] tracking-widest h-9 px-4 flex-1 md:flex-none">Reject</Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
