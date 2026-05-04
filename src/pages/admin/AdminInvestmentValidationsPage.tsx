import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, ExternalLink, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/services/supabase';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AdminInvestmentValidationsPage() {
  const [validations, setValidations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadValidations();
  }, []);

  const loadValidations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('deposits')
        .select(`
          *,
          profiles!deposits_user_id_fkey(username, email, full_name),
          investment_options!deposits_plan_id_fkey(option_name)
        `)
        .not('plan_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setValidations(data || []);
    } catch (error) {
      toast.error('Failed to load validations');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (validation: any) => {
    try {
      const { error } = await supabase.rpc('process_deposit_approval', {
        deposit_id_param: validation.id,
        admin_id: (await supabase.auth.getUser()).data.user?.id
      } as any);
      
      if (error) throw error;

      toast.success('Investment validated and activated successfully');
      loadValidations();
    } catch (error: unknown) {
      toast.error((error as any).message || 'Failed to approve validation');
      console.error(error);
    }
  };

  const handleReject = async (validationId: string) => {
    try {
      const { error } = await (supabase
        .from('deposits') as any)
        .update({ status: 'rejected' } as any)
        .eq('id', validationId);

      if (error) throw error;
      
      // Also update the transaction record
      const { data: deposit } = await (supabase.from('deposits').select('transaction_id').eq('id', validationId).single() as any);
      if (deposit) {
        await (supabase.from('transactions') as any).update({ status: 'rejected' } as any).eq('id', (deposit as any).transaction_id);
      }

      toast.success('Validation rejected');
      loadValidations();
    } catch (error: unknown) {
      toast.error((error as any).message || 'Failed to reject validation');
      console.error(error);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black v56-gradient-text tracking-tight uppercase italic">Investment <span className="text-foreground">Validations</span></h1>
          <p className="text-muted-foreground text-sm uppercase font-bold tracking-widest opacity-60">
            Audit and approve pending investment deposits
          </p>
        </div>
        <Button onClick={loadValidations} variant="outline" className="rounded-xl font-bold uppercase tracking-widest text-[10px]">
          Refresh List
        </Button>
      </div>

      <div className="v56-glass premium-border rounded-3xl overflow-hidden">
        <ScrollArea className="h-[70vh]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/5">
                <th className="p-4 text-[10px] uppercase font-black tracking-widest opacity-50">User</th>
                <th className="p-4 text-[10px] uppercase font-black tracking-widest opacity-50">Plan</th>
                <th className="p-4 text-[10px] uppercase font-black tracking-widest opacity-50">Amount</th>
                <th className="p-4 text-[10px] uppercase font-black tracking-widest opacity-50">Hash (TXID)</th>
                <th className="p-4 text-[10px] uppercase font-black tracking-widest opacity-50">Status</th>
                <th className="p-4 text-[10px] uppercase font-black tracking-widest opacity-50">Date</th>
                <th className="p-4 text-[10px] uppercase font-black tracking-widest opacity-50 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                  </td>
                </tr>
              ) : validations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground uppercase font-black tracking-widest text-xs">
                    No pending validations found
                  </td>
                </tr>
              ) : (
                validations.map((val) => (
                  <tr key={val.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{val.profiles?.full_name || val.profiles?.username || 'Anonymous'}</span>
                        <span className="text-[10px] opacity-40">{val.profiles?.email}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] uppercase font-black tracking-widest px-2">
                        {(val as any).investment_options?.option_name || 'Direct'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-primary">${val.amount} USDT</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 max-w-[200px]">
                        <code className="text-[10px] truncate opacity-60 font-mono">{val.transaction_hash}</code>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => window.open(`https://bscscan.com/tx/${val.transaction_hash}`, '_blank')}>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge 
                        variant="outline" 
                        className={`text-[9px] font-black uppercase tracking-widest border-none ${
                          val.status === 'validated' ? 'bg-green-500/10 text-green-500' : 
                          val.status === 'rejected' ? 'bg-red-500/10 text-red-500' : 
                          'bg-yellow-500/10 text-yellow-500'
                        }`}
                      >
                        {val.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] opacity-60">{new Date(val.created_at).toLocaleString()}</span>
                    </td>
                    <td className="p-4 text-right">
                      {val.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            className="h-8 bg-green-500 hover:bg-green-600 text-white font-black uppercase tracking-widest text-[9px] rounded-lg px-3"
                            onClick={() => handleApprove(val)}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            className="h-8 font-black uppercase tracking-widest text-[9px] rounded-lg px-3"
                            onClick={() => handleReject(val.id)}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ScrollArea>
      </div>

      <Card className="v56-glass premium-border bg-yellow-500/5 border-yellow-500/20">
        <CardContent className="p-4 flex gap-4 items-start">
          <ShieldAlert className="h-5 w-5 text-yellow-500 shrink-0 mt-1" />
          <div>
            <h4 className="text-[10px] uppercase font-black tracking-widest text-yellow-500 mb-1">Security Notice</h4>
            <p className="text-[11px] opacity-70 leading-relaxed font-bold">
              Always verify the transaction on the block explorer before approving. Ensure the amount and recipient address match the plan configuration.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
