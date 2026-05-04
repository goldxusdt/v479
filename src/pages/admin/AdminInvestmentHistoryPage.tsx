import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/services/supabase';
import { format } from 'date-fns';
import { History, Search, Download, TrendingUp, Users, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface InvestmentHistoryRecord {
  id: string;
  plan_name: string;
  created_at: string;
  expired_at: string;
  participant_count: number;
  total_deposit_amount: number;
  metadata: any;
}

export default function AdminInvestmentHistoryPage() {
  const [history, setHistory] = useState<InvestmentHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('investment_history')
        .select('*')
        .order('expired_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error: unknown) {
      console.error('Error loading investment history:', error);
      toast.error('Failed to load investment history');
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(h => 
    h.plan_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Plan Name,Created At,Expired At,Participants,Total Deposits\n"
      + filteredHistory.map(h => `${h.plan_name},${format(new Date(h.created_at), 'yyyy-MM-dd')},${format(new Date(h.expired_at), 'yyyy-MM-dd')},${h.participant_count},${h.total_deposit_amount}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `investment_history_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold v56-gradient-text">Investment History</h1>
          <p className="text-muted-foreground">Review performance of expired investment plans</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={loadHistory} variant="outline" size="icon">
            <History className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="v56-glass premium-border bg-primary/5">
          <CardHeader className="pb-2">
            <CardDescription className="uppercase text-[10px] font-bold tracking-widest">Total Expired Plans</CardDescription>
            <CardTitle className="text-3xl font-black italic">{history.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-primary">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-bold">Lifecycle Completed</span>
            </div>
          </CardContent>
        </Card>
        <Card className="v56-glass premium-border bg-green-500/5">
          <CardHeader className="pb-2">
            <CardDescription className="uppercase text-[10px] font-bold tracking-widest">Total Participants</CardDescription>
            <CardTitle className="text-3xl font-black italic text-green-500">
              {history.reduce((sum, h) => sum + h.participant_count, 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-green-500">
              <Users className="h-4 w-4" />
              <span className="text-xs font-bold">Unique User Entries</span>
            </div>
          </CardContent>
        </Card>
        <Card className="v56-glass premium-border bg-blue-500/5">
          <CardHeader className="pb-2">
            <CardDescription className="uppercase text-[10px] font-bold tracking-widest">Total Volume Handled</CardDescription>
            <CardTitle className="text-3xl font-black italic text-blue-500">
              ${history.reduce((sum, h) => sum + Number(h.total_deposit_amount), 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-blue-500">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-bold">USDT Investment Volume</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="v56-glass premium-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-black uppercase italic tracking-tight">History Log</CardTitle>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by plan name..."
              className="pl-10 bg-accent/30"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-white/5">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow>
                  <TableHead>Plan Name</TableHead>
                  <TableHead>Creation Date</TableHead>
                  <TableHead>Expiration Date</TableHead>
                  <TableHead className="text-center">Participants</TableHead>
                  <TableHead className="text-right">Total Deposits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5} className="h-12 animate-pulse bg-white/5" />
                    </TableRow>
                  ))
                ) : filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">
                      No historical plans found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHistory.map((h) => (
                    <TableRow key={h.id} className="hover:bg-white/5 transition-colors">
                      <TableCell className="font-bold text-primary italic uppercase tracking-tighter">
                        {h.plan_name}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(h.created_at), 'yyyy-MM-dd')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(h.expired_at), 'yyyy-MM-dd HH:mm')}
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {h.participant_count}
                      </TableCell>
                      <TableCell className="text-right font-black text-green-500 tabular-nums">
                        ${Number(h.total_deposit_amount).toLocaleString()}
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
