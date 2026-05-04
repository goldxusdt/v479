import { DollarSign, Search, Download, Filter, TrendingUp, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/services/supabase';
import { exportToCSV } from '@/utils/csv-export';

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    loadTransactions();

    // Real-time subscription for transactions
    const channel = supabase
      .channel('admin_transactions_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          loadTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [typeFilter]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      let query = supabase.from('transactions').select('*, profiles!transactions_user_id_fkey(email, full_name)');
      
      if (typeFilter !== 'all') {
        query = query.eq('transaction_type', typeFilter);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <ArrowDownCircle className="h-4 w-4 text-green-500" />;
      case 'withdrawal': return <ArrowUpCircle className="h-4 w-4 text-orange-500" />;
      case 'roi_credit': return <TrendingUp className="h-4 w-4 text-primary" />;
      case 'referral_commission':
      case 'referral_bonus': return <DollarSign className="h-4 w-4 text-blue-500" />;
      default: return <DollarSign className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const filteredTransactions = transactions.filter(tx =>
    (tx.profiles?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tx.admin_notes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tx.transaction_hash || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold v56-gradient-text">System Transactions</h1>
          <p className="text-muted-foreground">Monitor and export all platform transactions</p>
        </div>
        <Button variant="outline" onClick={() => exportToCSV(transactions, 'transactions_export')} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions by user or hash..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Transaction Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="deposit">Deposits</SelectItem>
            <SelectItem value="withdrawal">Withdrawals</SelectItem>
            <SelectItem value="roi_credit">ROI Credits</SelectItem>
            <SelectItem value="referral_commission">Referral Commission</SelectItem>
            <SelectItem value="referral_bonus">Referral Bonus (Legacy)</SelectItem>
            <SelectItem value="refund">Refunds</SelectItem>
            <SelectItem value="internal_swap">Internal Swaps</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="v56-glass premium-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-accent/50">
                <tr>
                  <th className="px-6 py-3">Transaction</th>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3 text-right">Amount (USDT)</th>
                  <th className="px-6 py-3 text-right">Fee</th>
                  <th className="px-6 py-3 text-right">Status</th>
                  <th className="px-6 py-3 text-right">Month</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTransactions.map((tx) => {
                  const createdAt = new Date(tx.created_at);
                  const month = createdAt.toLocaleString('default', { month: 'short', year: 'numeric' });
                  
                  return (
                    <tr key={tx.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getIcon(tx.transaction_type || '')}
                          <span className="capitalize font-semibold">{(tx.transaction_type || '').replace('_', ' ')}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-1 line-clamp-1">{tx.transaction_hash || tx.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-xs">{tx.profiles?.full_name || 'N/A'}</div>
                        <div className="text-[10px] text-muted-foreground">{tx.profiles?.email}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-bold">{Number(tx.amount || 0).toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 text-right text-red-500 font-bold">
                        {Number(tx.fee || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                          tx.status === 'completed' || tx.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                          tx.status === 'failed' || tx.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                          'bg-yellow-500/20 text-yellow-500'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-muted-foreground">
                        {month}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
