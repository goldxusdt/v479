import { useState, useEffect } from 'react';
import { Clock, ShieldCheck } from 'lucide-react';

export const CountdownTimer = ({ startDate, durationDays, durationHours, className }: { startDate: string, durationDays: number, durationHours: number, className?: string }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const start = new Date(startDate).getTime();
      const durationMs = (durationDays * 24 * 60 * 60 * 1000) + (durationHours * 60 * 60 * 1000);
      const end = start + durationMs;
      const now = new Date().getTime();
      const difference = end - now;

      if (difference <= 0) {
        setTimeLeft('Completed');
        setIsCompleted(true);
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

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [startDate, durationDays, durationHours]);

  return (
    <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${isCompleted ? 'text-green-500' : 'text-primary'} ${className}`}>
      <Clock className="h-3 w-3" />
      {isCompleted ? (
        <span className="flex items-center gap-1">
          Refund Ready <ShieldCheck className="h-3 w-3" />
        </span>
      ) : (
        <span>Refund in: {timeLeft}</span>
      )}
    </div>
  );
};
