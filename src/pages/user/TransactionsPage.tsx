import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Clock, 
  DollarSign, 
  Filter, 
  TrendingUp, 
  ArrowLeft,
  Download,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  FileText
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function UserTransactionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadTransactions();
      
      const channel = supabase
        .channel(`public:transactions:user_id=eq.${user.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'transactions', 
          filter: `user_id=eq.${user.id}` 
        }, () => {
          loadTransactions();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, typeFilter, statusFilter, page]);

  const loadTransactions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);
      
      if (typeFilter !== 'all') {
        query = query.eq('transaction_type', typeFilter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;
      setTransactions(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => 
    (tx.admin_notes || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tx.transaction_hash || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tx.wallet_address || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <ArrowDownCircle className="h-5 w-5 text-green-500" />;
      case 'withdrawal': return <ArrowUpCircle className="h-5 w-5 text-orange-500" />;
      case 'roi_credit': return <TrendingUp className="h-5 w-5 text-primary" />;
      case 'referral_commission':
      case 'referral_bonus': return <DollarSign className="h-5 w-5 text-blue-500" />;
      default: return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const exportToCSV = () => {
    if (transactions.length === 0) {
      toast.error('No transactions to export');
      return;
    }

    const headers = ['Date', 'Type', 'Amount', 'Status', 'Notes', 'Network', 'Address', 'Hash'];
    const csvData = transactions.map(tx => [
      new Date(tx.created_at).toLocaleString(),
      tx.transaction_type,
      tx.amount,
      tx.status,
      tx.admin_notes || '',
      tx.network || '',
      tx.wallet_address || '',
      tx.transaction_hash || ''
    ]);

    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Transactions exported as CSV');
  };

  const exportToPDF = () => {
    if (transactions.length === 0) {
      toast.error('No transactions to export');
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Transaction History Report', 14, 20);
    doc.setFontSize(12);
    doc.text(`User: ${user?.email}`, 14, 30);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 37);

    (doc as any).autoTable({
      startY: 45,
      head: [['Date', 'Type', 'Amount', 'Status', 'Notes']],
      body: transactions.map(tx => [
        new Date(tx.created_at).toLocaleDateString(),
        (tx.transaction_type || '').replace('_', ' ').toUpperCase(),
        `${Number(tx.amount).toFixed(2)} USDT`,
        tx.status.toUpperCase(),
        tx.admin_notes || '-'
      ]),
    });

    doc.save(`transactions_${new Date().getTime()}.pdf`);
    toast.success('Transactions exported as PDF');
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold v56-gradient-text tracking-tight flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              Transaction History
            </h1>
            <p className="text-muted-foreground">Comprehensive record of your financial activities</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV} className="v56-glass flex-1 md:flex-none">
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" onClick={exportToPDF} className="v56-glass flex-1 md:flex-none">
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search notes, hash..." 
              className="v56-glass pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Type</label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="v56-glass">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="deposit">Deposits</SelectItem>
              <SelectItem value="withdrawal">Withdrawals</SelectItem>
              <SelectItem value="roi_credit">ROI Credits</SelectItem>
              <SelectItem value="referral_commission">Referral Bonus</SelectItem>
              <SelectItem value="referral_bonus">Referral Bonus (Legacy)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="v56-glass">
              <Clock className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed/Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="v56-glass premium-border overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-[10px] uppercase font-bold">Transaction</th>
                  <th className="px-6 py-4 text-[10px] uppercase font-bold">Details</th>
                  <th className="px-6 py-4 text-[10px] uppercase font-bold">Amount</th>
                  <th className="px-6 py-4 text-[10px] uppercase font-bold">Status</th>
                  <th className="px-6 py-4 text-[10px] uppercase font-bold text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-6 py-4">
                        <Skeleton className="h-12 w-full bg-muted" />
                      </td>
                    </tr>
                  ))
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No transactions found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-accent/10 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-background rounded-lg border border-border group-hover:border-primary/30 transition-colors">
                            {getIcon(tx.transaction_type)}
                          </div>
                          <div>
                            <p className="font-bold text-sm capitalize">{(tx.transaction_type || '').replace('_', ' ')}</p>
                            <p className="text-[10px] text-muted-foreground uppercase">{tx.network || 'Internal'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-[200px]">
                        <p className="text-xs truncate">{tx.admin_notes || 'No notes'}</p>
                        {tx.transaction_hash && (
                          <a 
                            href={`https://tronscan.org/#/transaction/${tx.transaction_hash}`} 
                            target="_blank" 
                            className="text-[10px] text-primary hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                            {tx.transaction_hash.substring(0, 10)}...
                          </a>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className={`font-bold ${
                          tx.transaction_type === 'deposit' || tx.transaction_type === 'roi_credit' || tx.transaction_type === 'referral_bonus' || tx.transaction_type === 'referral_commission'
                            ? 'text-green-500' 
                            : 'text-orange-500'
                        }`}>
                          {tx.transaction_type === 'deposit' || tx.transaction_type === 'roi_credit' || tx.transaction_type === 'referral_bonus' || tx.transaction_type === 'referral_commission' ? '+' : '-'}
                          {Number(tx.amount || 0).toFixed(2)} USDT
                        </p>
                        <p className="text-[10px] text-muted-foreground">Fee: {Number(tx.fee || 0).toFixed(2)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={`capitalize border-none px-2 py-0.5 ${
                          tx.status === 'completed' || tx.status === 'approved' ? 'bg-green-500/10 text-green-500' :
                          tx.status === 'rejected' || tx.status === 'failed' ? 'bg-red-500/10 text-red-500' :
                          'bg-yellow-500/10 text-yellow-500'
                        }`}>
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-xs font-medium">{new Date(tx.created_at).toLocaleDateString()}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleTimeString()}</p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-muted/30 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} entries
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="v56-glass h-8 px-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = page;
                    if (totalPages > 5) {
                      if (page <= 3) pageNum = i + 1;
                      else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = page - 2 + i;
                    } else {
                      pageNum = i + 1;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className={`h-8 w-8 p-0 ${page === pageNum ? 'v56-primary-btn' : 'v56-glass'}`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="v56-glass h-8 px-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
