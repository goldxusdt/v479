import { CheckCircle, Clock, MessageSquare, Plus, XCircle, PlusCircle, ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { createSupportTicket, getSupportTickets } from '@/services/api';
import { supabase } from '@/services/supabase';
import type { SupportTicket } from '@/types';

export default function SupportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [helpLinks, setHelpLinks] = useState({
    deposit: '',
    kyc: '',
    withdrawal: ''
  });
  
  const [formData, setFormData] = useState({
    subject: '',
    category: 'general' as 'general' | 'deposit' | 'withdrawal' | 'kyc' | 'technical' | 'other',
    message: ''
  });

  useEffect(() => {
    loadTickets();
    loadFaqs();
    loadHelpLinks();
  }, [user]);

  const loadFaqs = async () => {
    const { data } = await supabase.from('faqs').select('*').eq('is_active', true);
    setFaqs(data || []);
  };

  const loadHelpLinks = async () => {
    const { data } = await supabase.from('settings').select('key, value');
    const links: any = { ...helpLinks };
    (data || []).forEach((s: any) => {
      if (s.key === 'youtube_deposit_help') links.deposit = s.value;
      if (s.key === 'youtube_kyc_help') links.kyc = s.value;
      if (s.key === 'youtube_withdrawal_help') links.withdrawal = s.value;
    });
    setHelpLinks(links);
  };

  const loadTickets = async () => {
    if (!user) return;
    const data = await getSupportTickets(user.id);
    if (data) setTickets(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.subject || !formData.message) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await createSupportTicket(
        user.id,
        formData.subject,
        formData.message
      );

      if (error) throw error;

      toast.success('Support ticket created successfully');
      setFormData({ subject: '', category: 'general', message: '' });
      setDialogOpen(false);
      loadTickets();
    } catch (error) {
      toast.error('Failed to create support ticket');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'in_progress':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'closed':
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };


  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold v56-gradient-text">Support Center</h1>
            <p className="text-muted-foreground">Get help with your account and transactions</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="">
              <Plus className="mr-2 h-4 w-4" />
              New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="duration-0 animate-none fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]">
            <DialogHeader>
              <DialogTitle>Create Support Ticket</DialogTitle>
              <DialogDescription>
                Describe your issue and we'll get back to you as soon as possible
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Brief description of your issue"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: typeof formData.category) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Inquiry</SelectItem>
                    <SelectItem value="deposit">Deposit Issue</SelectItem>
                    <SelectItem value="withdrawal">Withdrawal Issue</SelectItem>
                    <SelectItem value="kyc">KYC Verification</SelectItem>
                    <SelectItem value="technical">Technical Support</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Provide detailed information about your issue"
                  rows={5}
                  required
                />
              </div>

              <Button type="submit" className="w-full " disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Ticket'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Help */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/20 card-glow cursor-pointer hover:border-primary transition-all" onClick={() => window.open(helpLinks.deposit || '#', '_blank')}>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              Deposit Help <PlusCircle className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Minimum deposit: 100 USDT. Use BEP-20 or TRC-20 network. Click to view video tutorial.
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/20 card-glow cursor-pointer hover:border-primary transition-all" onClick={() => window.open(helpLinks.withdrawal || '#', '_blank')}>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              Withdrawal Help <PlusCircle className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Minimum: 50 USDT. 5% fee applies. Click to view video tutorial.
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/20 card-glow cursor-pointer hover:border-primary transition-all" onClick={() => window.open(helpLinks.kyc || '#', '_blank')}>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              KYC Help <PlusCircle className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Clear photos of ID required. Max 1MB. Click to view video tutorial.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FAQs */}
        <Card className="border-primary/20 card-glow h-full">
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
            <CardDescription>Quick answers to common questions about Gold X Usdt platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
            {faqs.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">No FAQs available.</p>
            ) : faqs.map((faq, i) => (
              <div key={i} className="border-b border-border pb-4 last:border-0">
                <p className="font-semibold text-sm text-primary mb-2">Q: {faq.question}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">A: {faq.answer}</p>
                {faq.category && (
                  <span className="inline-block mt-2 px-2 py-1 text-xs bg-primary/10 text-primary rounded">
                    {faq.category}
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Tickets List */}
        <Card className="border-primary/20 card-glow h-full">
          <CardHeader>
            <CardTitle>Your Support Tickets</CardTitle>
            <CardDescription>Track your support requests</CardDescription>
          </CardHeader>
          <CardContent>
            {tickets.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No support tickets yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-4 border border-primary/10 rounded-lg hover:border-primary/30 transition-all bg-accent/30"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(ticket.status)}
                          <h3 className="font-semibold text-sm">{ticket.subject}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {ticket.message}
                        </p>
                        {(ticket as any).admin_reply && (
                          <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-xl relative group overflow-hidden transition-all hover:bg-primary/10">
                            <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity"><MessageSquare size={40} /></div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1 flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                              Official Response
                            </p>
                            <p className="text-xs italic leading-relaxed">"{(ticket as any).admin_reply}"</p>
                            {(ticket as any).admin_replied_at && (
                              <p className="text-[9px] text-muted-foreground mt-2 font-bold opacity-50">
                                Replied on {new Date((ticket as any).admin_replied_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                        ticket.status === 'resolved' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                        ticket.status === 'open' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' :
                        'bg-blue-500/10 border-blue-500/20 text-blue-500'
                      }`}>
                        {(ticket.status || '').replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contact Information */}
      <Card className="border-primary/20 card-glow">
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>Other ways to reach us</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Email:</span>
            <span className="font-medium">support@goldxusdt.com</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Response Time:</span>
            <span className="font-medium">within business hours</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Support Hours:</span>
            <span className="font-medium">24/7</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
