import { useEffect, useState } from 'react';
import { Clock, Zap } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/utils/utils';

interface ROITimerProps {
  lastCreditAt: string | null;
  className?: string;
}

export function ROITimer({ lastCreditAt, className }: ROITimerProps) {
  const { user, refreshProfile } = useAuth();
  const [timeLeft, setTimeLeft] = useState<string>('24:00:00');
  const [referenceDate, setReferenceDate] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [isCrediting, setIsCrediting] = useState(false);

  useEffect(() => {
    async function getReferenceDate() {
      if (!user) return;

      // Check current deposit balance
      const { data: walletData } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .eq('wallet_type', 'deposit')
        .maybeSingle() as { data: { balance: number } | null };
      
      const balance = Number(walletData?.balance || 0);

      // Requirement: Timer stops if deposit balance is zero
      if (balance <= 0) {
        setReferenceDate(null);
        return;
      }

      if (lastCreditAt) {
        setReferenceDate(new Date(lastCreditAt).getTime());
        return;
      }

      // Prioritize earliest active investment date
      const { data: invData } = await supabase
        .from('user_investment_selections')
        .select('created_at')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle() as { data: { created_at: string } | null };

      if (invData?.created_at) {
        setReferenceDate(new Date(invData.created_at).getTime());
        return;
      }

      // Fallback to earliest approved deposit
      const { data: depData } = await supabase
        .from('deposits')
        .select('approved_at')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .order('approved_at', { ascending: true })
        .limit(1)
        .maybeSingle() as { data: { approved_at: string } | null };

      if (depData?.approved_at) {
        setReferenceDate(new Date(depData.approved_at).getTime());
      } else {
        setReferenceDate(null);
      }
    }

    getReferenceDate();

    // Subscribe to wallet changes to stop timer immediately if balance hits zero
    const channel = supabase
      .channel('wallet_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user?.id}`
        },
        async (payload) => {
          if (payload.new && (payload.new as any).wallet_type === 'deposit') {
            const newBalance = Number((payload.new as any).balance);
            if (newBalance <= 0) {
              setReferenceDate(null);
            } else {
              // Re-fetch to possibly restart if it was stopped
              getReferenceDate();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lastCreditAt, user]);

  useEffect(() => {
    const handleCreditROI = async () => {
      if (!user || isCrediting) return;
      setIsCrediting(true);
      try {
        const { data, error } = await (supabase as any).rpc('credit_user_roi', { p_user_id: user.id });
        if (error) throw error;
        
        if (data?.success) {
          if (data.amount > 0) {
            // toast.success(`ROI of ${data.amount} USDT credited!`);
          }
          await refreshProfile();
        } else if (data?.message?.includes('Zero or negative deposit balance')) {
          setReferenceDate(null);
        }
      } catch (err) {
        console.error('Failed to credit ROI:', err);
      } finally {
        setIsCrediting(false);
      }
    };

    const updateTime = () => {
      if (!referenceDate) return;
      
      const now = new Date().getTime();
      // Next payout is 24h after the last credit
      const next = referenceDate + 24 * 60 * 60 * 1000;
      const total = 24 * 60 * 60 * 1000;
      const remaining = next - now;

      // If past due, show 0 and trigger credit
      if (remaining <= 0) {
        setTimeLeft('00:00:00');
        setProgress(100);
        
        // Only trigger if not already in progress
        // We add a small 2-second buffer to allow for server processing
        if (!isCrediting) {
          handleCreditROI();
        }
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      const elapsed = total - remaining;
      setProgress((elapsed / total) * 100);
      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    const timer = setInterval(updateTime, 1000);
    updateTime();
    return () => clearInterval(timer);
  }, [referenceDate, user, isCrediting, refreshProfile]);

  if (!referenceDate) {
    return (
      <div className={cn("v56-glass p-4 rounded-2xl premium-border bg-white/5", className)}>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-tight">ROI Cycle Status</p>
            <p className="text-sm font-bold text-white leading-tight mt-1">Waiting for active investment</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("v56-glass p-4 rounded-2xl premium-border gold-shimmer", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Clock className="h-4 w-4 text-primary animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-tight">Next Payout Cycle</p>
            <p className="text-xl font-mono font-black text-primary  leading-none mt-1">
              {isCrediting ? (
                <span className="flex items-center gap-1">
                  Processing...
                </span>
              ) : timeLeft}
            </p>
          </div>
        </div>
        <div className="text-right">
          <Zap className="h-4 w-4 text-primary ml-auto mb-1" />
          <p className="text-[10px] text-muted-foreground font-mono">{Math.round(progress)}% Complete</p>
        </div>
      </div>
      
      <div className="relative h-1.5 bg-secondary/10 rounded-full overflow-hidden">
        <div 
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-yellow-300 transition-all duration-1000 rounded-full "
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
