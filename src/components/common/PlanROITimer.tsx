import { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { toast } from 'sonner';
import { cn } from '@/utils/utils';

export const PlanROITimer = ({ 
  selectionId, 
  lastPayoutAt, 
  frequency = 'daily',
  onPayoutComplete 
}: { 
  selectionId: string, 
  lastPayoutAt: string, 
  frequency?: string,
  onPayoutComplete?: () => void 
}) => {
  const [timeLeft, setTimeLeft] = useState<string>('00:00:00');
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false);
  const lastFailureRef = useRef<number>(0);

  useEffect(() => {
    let timer: any;
    
    const calculateTimeLeft = () => {
      const lastPayout = new Date(lastPayoutAt).getTime();
      let intervalMs = 24 * 60 * 60 * 1000; // default daily

      if (frequency === 'weekly') {
        intervalMs = 7 * 24 * 60 * 60 * 1000;
      } else if (frequency === 'monthly') {
        intervalMs = 30 * 24 * 60 * 60 * 1000;
      }

      const nextPayout = lastPayout + intervalMs;
      const now = new Date().getTime();
      const difference = nextPayout - now;
      
      const elapsed = now - lastPayout;
      const currentProgress = Math.min(100, Math.max(0, (elapsed / intervalMs) * 100));
      setProgress(currentProgress);

      if (difference <= 0) {
        setTimeLeft('00:00:00');
        const currentTime = Date.now();
        if (!isProcessingRef.current && (currentTime - lastFailureRef.current > 30000)) {
          handlePayout();
        }
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      const d = days.toString().padStart(2, '0');
      const h = hours.toString().padStart(2, '0');
      const m = minutes.toString().padStart(2, '0');
      const s = seconds.toString().padStart(2, '0');

      if (days > 0) {
        setTimeLeft(`${d}:${h}:${m}:${s}`);
      } else {
        setTimeLeft(`${h}:${m}:${s}`);
      }
    };

    const handlePayout = async () => {
       if (isProcessingRef.current) return;
       isProcessingRef.current = true;
       setIsProcessing(true);
       try {
         const { data, error } = await (supabase as any).rpc('process_plan_roi_payout', {
           p_selection_id: selectionId
         });
         
         if (error) throw error;
         
         if (data?.success) {
           toast.success('ROI Credited!');
           lastFailureRef.current = 0;
           if (onPayoutComplete) onPayoutComplete();
         } else {
           lastFailureRef.current = Date.now();
           // If it's not due yet, it's not really an error but we should log it
           if (data?.message?.includes('not due yet')) {
             console.log('ROI Payout info:', data.message);
           } else {
             toast.error(data?.message || 'Failed to credit ROI');
           }
         }
       } catch (err) {
         console.error('Auto-payout failed:', err);
       } finally {
         isProcessingRef.current = false;
         setIsProcessing(false);
       }
    };

    calculateTimeLeft();
    timer = setInterval(calculateTimeLeft, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [selectionId, lastPayoutAt]);

  return (
    <div className="space-y-2 w-full">
      <div className="flex items-center justify-between text-[10px] font-black tabular-nums">
        <div className="flex items-center gap-2">
          <Clock className={cn("h-3 w-3 text-primary", !isProcessing && "animate-pulse")} />
          <span className="text-primary uppercase tracking-widest">
            {isProcessing ? 'Crediting ROI...' : `Next Payout: ${timeLeft}`}
          </span>
        </div>
        <span className="text-muted-foreground opacity-60 uppercase">{frequency} Cycle</span>
      </div>
      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
        <div 
          className={cn(
            "h-full transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(255,215,0,0.3)]",
            isProcessing ? "bg-green-500 animate-pulse" : "bg-primary"
          )}
          style={{ width: `${progress}%` }} 
        />
      </div>
    </div>
  );
};
