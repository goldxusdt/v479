import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export const PlanExpirationTimer = ({ 
  expiresAt, 
  onExpired 
}: { 
  expiresAt: string, 
  onExpired?: () => void 
}) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    let timer: any;
    
    const calculateTimeLeft = () => {
      const expirationDate = new Date(expiresAt).getTime();
      const now = new Date().getTime();
      const difference = expirationDate - now;

      if (difference <= 0) {
        setTimeLeft('00:00:00');
        if (onExpired) onExpired();
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      const d = days > 0 ? `${days}d ` : '';
      const h = hours.toString().padStart(2, '0');
      const m = minutes.toString().padStart(2, '0');
      const s = seconds.toString().padStart(2, '0');

      setTimeLeft(`${d}${h}:${m}:${s}`);
    };

    calculateTimeLeft();
    timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-[10px] font-black tabular-nums text-red-500 animate-pulse">
      <Clock className="h-3 w-3" />
      <span className="uppercase tracking-widest">Expires In: {timeLeft}</span>
    </div>
  );
};
