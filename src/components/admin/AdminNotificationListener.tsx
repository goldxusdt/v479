import { useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { toast } from 'sonner';
import { 
  UserPlus, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  ShieldCheck, 
  MessageSquare, 
  TrendingUp, 
  Bell 
} from 'lucide-react';
import { cn } from '@/utils/utils';
import { useAuth } from '@/contexts/AuthContext';

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

export function AdminNotificationListener() {
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (!isAdmin) return;

    // Subscribe to real-time updates for admin notifications
    const channel = supabase
      .channel('global_admin_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_events'
        },
        (payload) => {
          const newEvent = payload.new;
          
          // Unmistakable visual alert for ALL admin pages
          toast.custom(() => (
            <div className="v56-glass premium-border p-4 rounded-xl flex items-start gap-4 animate-in slide-in-from-right-full shadow-2xl">
              <div className={cn("p-2 rounded-lg shrink-0", eventColorMap[newEvent.event_type] || "bg-primary/10 text-primary")}>
                {(() => {
                  const Icon = eventIconMap[newEvent.event_type] || Bell;
                  return <Icon className="h-5 w-5" />;
                })()}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">System Alert</p>
                  <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                </div>
                <p className="text-sm font-bold text-white">{newEvent.title}</p>
                <p className="text-[10px] text-muted-foreground line-clamp-2">{newEvent.message}</p>
              </div>
            </div>
          ), {
            duration: 8000, // Longer duration for visibility
            position: 'top-right',
          });
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Realtime subscription failed for admin notifications. Check permissions.');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  return null; // This component doesn't render anything
}
