import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';
import { format } from 'date-fns';
import { History, Search, Download, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface DepositRecord {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  transaction_hash: string;
  network: string;
  investment_options?: {
    option_name: string;
  };
}

export default function DepositHistoryPage() {
  const { user } = useAuth();
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      loadDeposits();
    }
  }, [user]);

  const loadDeposits = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('deposits')
        .select(`
          *,
          investment_options(option_name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeposits(data || []);
    } catch (error: unknown) {
      console.error('Error loading deposits:', error);
      toast.error('Failed to load deposit history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const filteredDeposits = deposits.filter(d => 
    d.transaction_hash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.investment_options?.option_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.amount.toString().includes(searchTerm)
  );

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Date,Amount,Plan,Status,Hash\n"
      + filteredDeposits.map(d => `${format(new Date(d.created_at), 'yyyy-MM-dd HH:mm')},${d.amount},${d.investment_options?.option_name || 'N/A'},${d.status},${d.transaction_hash || ''}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `deposit_history_${user?.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/deposit">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deposit History</h1>
          <p className="text-muted-foreground text-sm">View all your previous deposit requests</p>
        </div>
      </div>

      <Card className="v56-glass premium-border">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-primary flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Deposits
            </CardTitle>
            <CardDescription>Track the status of your fund transfers</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by hash or plan..."
                className="pl-9 w-full sm:w-[250px] bg-background/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/50">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[180px]">Date</TableHead>
                  <TableHead>Amount (USDT)</TableHead>
                  <TableHead>Investment Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Transaction Hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5} className="h-12 animate-pulse bg-muted/20" />
                    </TableRow>
                  ))
                ) : filteredDeposits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No deposit records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDeposits.map((deposit) => (
                    <TableRow key={deposit.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">
                        {format(new Date(deposit.created_at), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="font-bold text-primary">
                        ${deposit.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {deposit.investment_options?.option_name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(deposit.status)}>
                          {deposit.status.charAt(0).toUpperCase() + deposit.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-[200px] truncate text-xs text-muted-foreground">
                        {deposit.transaction_hash || '---'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
