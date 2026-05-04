import { Send, Search, Filter, RefreshCw } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { cn } from '@/utils/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/services/supabase';
import type { SupportTicket } from '@/types';

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reply, setReply] = useState('');

  const [isLiveRefresh, setIsLiveRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadTickets = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      let query = supabase.from('support_tickets').select('*, profiles!support_tickets_user_id_fkey(email, full_name)');
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadTickets();

    // Real-time subscription for support tickets
    const channel = supabase
      .channel('admin_tickets_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        () => {
          loadTickets(false);
        }
      )
      .subscribe();

    let interval: NodeJS.Timeout;
    if (isLiveRefresh) {
      interval = setInterval(() => {
        loadTickets(false);
      }, 30000);
    }

    return () => {
      supabase.removeChannel(channel);
      if (interval) clearInterval(interval);
    };
  }, [loadTickets, isLiveRefresh]);

  const handleReply = async () => {
    if (!selectedTicket || !reply) return;

    try {
      const { error } = await supabase
        .from('support_tickets')
        // @ts-ignore - Supabase type inference issue
        .update({ 
          admin_reply: reply,
          status: 'resolved',
          admin_replied_at: new Date().toISOString()
        })
        .eq('id', selectedTicket.id);

      if (error) throw error;
      toast.success('Reply sent successfully');
      setReply('');
      setDialogOpen(false);
      loadTickets();
    } catch (error) {
      console.error('Failed to send reply:', error);
      toast.error('Failed to send reply');
    }
  };

  const handleStatusChange = async (ticketId: string, status: string) => {
    try {
      const updateQuery = supabase
        .from('support_tickets')
        // @ts-ignore - Supabase type inference issue
        .update({ status });
      
      const { error } = await updateQuery.eq('id', ticketId);

      if (error) throw error;
      toast.success('Status updated');
      loadTickets();
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold v56-gradient-text">Support Tickets</h1>
          <p className="text-muted-foreground">Manage user support requests</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadTickets()} 
            className="v56-glass border-white/10 uppercase font-black text-[10px] tracking-widest h-10 px-4"
          >
            <RefreshCw className="mr-2 h-3 w-3" />
            Refresh
          </Button>
          <Button 
            variant={isLiveRefresh ? "default" : "outline"} 
            size="sm" 
            onClick={() => setIsLiveRefresh(!isLiveRefresh)} 
            className="v56-glass border-white/10 uppercase font-black text-[10px] tracking-widest h-10 px-4"
          >
            <RefreshCw className={cn("mr-2 h-3 w-3", isLiveRefresh && "animate-pulse text-green-500")} />
            {isLiveRefresh ? 'Live ON' : 'Live OFF'}
          </Button>
        </div>
      </div>

      <div className="text-[10px] uppercase font-bold text-muted-foreground opacity-60">
        Last update: {format(lastRefresh, 'HH:mm:ss')}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets by user, email or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="v56-glass premium-border">
        <CardHeader>
          <CardTitle>All Tickets ({tickets.length})</CardTitle>
          <CardDescription>User and guest support requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12">Loading tickets...</div>
            ) : tickets.filter(t => 
                t.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
                t.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ((t as any).profiles?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                ((t as any).guest_email || '').toLowerCase().includes(searchTerm.toLowerCase())
              ).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No tickets found.</div>
            ) : (
              tickets.filter(t => 
                t.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
                t.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ((t as any).profiles?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                ((t as any).guest_email || '').toLowerCase().includes(searchTerm.toLowerCase())
              ).map((ticket) => (
              <div
                key={ticket.id}
                className="p-4 border border-primary/10 rounded-lg bg-accent/30"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <p className="font-semibold">{ticket.subject}</p>
                    <p className="text-sm text-muted-foreground">
                      From: {(ticket as any).profiles?.email || (ticket as any).guest_email || 'Unknown'}
                      {((ticket as any).guest_name) && ` (${(ticket as any).guest_name})`}
                    </p>
                    <p className="text-sm mt-2">{ticket.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(ticket.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Select
                      value={ticket.status}
                      onValueChange={(value) => handleStatusChange(ticket.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(ticket as any).admin_reply && (
                  <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded">
                    <p className="text-xs font-semibold text-primary mb-1">Your Reply:</p>
                    <p className="text-sm">{(ticket as any).admin_reply}</p>
                  </div>
                )}

                <Dialog open={dialogOpen && selectedTicket?.id === ticket.id} onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (open) setSelectedTicket(ticket);
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="mt-3 w-full">
                      <Send className="h-4 w-4 mr-2" />
                      Reply to Ticket
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="duration-0 animate-none fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]">
                    <DialogHeader>
                      <DialogTitle>Reply to Support Ticket</DialogTitle>
                      <DialogDescription>Send a response to the user</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Your Reply</Label>
                        <Textarea
                          value={reply}
                          onChange={(e) => setReply(e.target.value)}
                          placeholder="Type your response..."
                          rows={5}
                        />
                      </div>
                      <Button onClick={handleReply} className="w-full">
                        Send Reply
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ))
          )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
