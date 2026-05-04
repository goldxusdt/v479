import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { format } from 'date-fns';
import { 
  UserPlus, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  ShieldCheck, 
  MessageSquare, 
  TrendingUp, 
  Bell,
  Activity,
  Clock,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/utils/utils';

interface ActivityEvent {
  id: string;
  event_type: string;
  title: string;
  message: string;
  metadata: any;
  created_at: string;
  user_id?: string;
}

const eventIconMap: Record<string, any> = {
  'user_registered': UserPlus,
  'deposit_requested': ArrowDownCircle,
  'deposit_approved': ArrowDownCircle,
  'withdrawal_requested': ArrowUpCircle,
  'withdrawal_approved': ArrowUpCircle,
  'kyc_submitted': ShieldCheck,
  'kyc_approved': ShieldCheck,
  'kyc_rejected': ShieldCheck,
  'support_ticket_created': MessageSquare,
  'referral_earned': TrendingUp,
};

const eventColorMap: Record<string, string> = {
  'user_registered': 'text-blue-500 bg-blue-500/10',
  'deposit_requested': 'text-yellow-500 bg-yellow-500/10',
  'deposit_approved': 'text-green-500 bg-green-500/10',
  'withdrawal_requested': 'text-orange-500 bg-orange-500/10',
  'withdrawal_approved': 'text-green-500 bg-green-500/10',
  'kyc_submitted': 'text-purple-500 bg-purple-500/10',
  'kyc_approved': 'text-green-500 bg-green-500/10',
  'kyc_rejected': 'text-red-500 bg-red-500/10',
  'support_ticket_created': 'text-cyan-500 bg-cyan-500/10',
  'referral_earned': 'text-primary bg-primary/10',
};

export function ActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialEvents();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('admin_activity_feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_events'
        },
        (payload) => {
          const newEvent = payload.new as ActivityEvent;
          setEvents(prev => [newEvent, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadInitialEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Failed to load initial events:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="v56-glass premium-border h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-black uppercase italic tracking-tighter flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary animate-pulse" />
              Real-time Activity
            </CardTitle>
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest opacity-60">Instant System Event Stream</CardDescription>
          </div>
          <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary animate-pulse text-[10px]">
            Live Sync
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[400px] px-6 pb-6">
          <div className="space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4 opacity-50">
                <Clock className="h-8 w-8 animate-spin" />
                <p className="text-[10px] uppercase font-black tracking-widest">Synchronizing...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4 opacity-50 border-2 border-dashed border-white/5 rounded-2xl">
                <Activity className="h-8 w-8 text-muted-foreground" />
                <p className="text-[10px] uppercase font-black tracking-widest">No activity recorded yet</p>
              </div>
            ) : (
              events.map((event, index) => {
                const Icon = eventIconMap[event.event_type] || Bell;
                const isNew = index === 0;
                
                return (
                  <div key={event.id} className={cn(
                    "relative pl-8 pb-6 border-l border-white/10 last:pb-0",
                    isNew && "border-primary/30"
                  )}>
                    {/* Event Dot */}
                    <div className={cn(
                      "absolute -left-1.5 top-0 w-3 h-3 rounded-full border-2 border-background z-10",
                      isNew ? "bg-primary animate-ping" : "bg-muted-foreground/30"
                    )} />
                    {isNew && <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-primary z-20" />}
                    
                    <div className={cn(
                      "group p-4 rounded-xl border border-white/5 transition-all duration-300 hover:bg-white/5 hover:translate-x-1",
                      isNew && "bg-primary/5 border-primary/20 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]"
                    )}>
                      <div className="flex items-start justify-between gap-4">
                        <div className={cn("p-2 rounded-lg shrink-0", eventColorMap[event.event_type] || "bg-muted text-muted-foreground")}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">
                              {event.event_type.replace(/_/g, ' ')}
                            </p>
                            <time className="text-[8px] font-bold text-muted-foreground/60">
                              {format(new Date(event.created_at), 'HH:mm:ss')}
                            </time>
                          </div>
                          <h4 className="text-xs font-bold text-white group-hover:text-primary transition-colors">{event.title}</h4>
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            {event.message}
                          </p>
                        </div>
                        {event.user_id && (
                          <button 
                            onClick={() => window.open(`/admin/users/${event.user_id}`, '_blank')}
                            className="p-1 rounded bg-white/5 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all opacity-0 group-hover:opacity-100"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
