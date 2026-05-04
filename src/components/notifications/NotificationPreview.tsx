import { Bell, Monitor } from 'lucide-react';

interface NotificationPreviewProps {
  title: string;
  body: string;
  iconUrl?: string;
  type: 'mobile' | 'desktop';
}

export function NotificationPreview({ title, body, iconUrl, type }: NotificationPreviewProps) {
  const displayTitle = title || 'Notification Title';
  const displayBody = body || 'This is where your notification message will appear. Keep it concise and engaging.';

  if (type === 'mobile') {
    return (
      <div className="relative w-[300px] h-[600px] bg-black rounded-[3rem] border-[8px] border-zinc-800 shadow-2xl overflow-hidden scale-90 sm:scale-100">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-20" />
        
        {/* Screen Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/20 to-purple-600/20" />
        
        {/* Notification Banner */}
        <div className="absolute top-16 left-4 right-4 animate-in slide-in-from-top duration-500">
          <div className="v56-glass p-3 rounded-2xl border border-white/20 shadow-xl backdrop-blur-xl flex gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
              {iconUrl ? (
                <img src={iconUrl} alt="" className="h-full w-full object-cover rounded-xl" />
              ) : (
                <Bell className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex justify-between items-center mb-0.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary truncate">Gold X USDT</p>
                <span className="text-[8px] text-white/40 uppercase font-bold">now</span>
              </div>
              <p className="text-xs font-bold text-white truncate">{displayTitle}</p>
              <p className="text-[10px] text-white/70 line-clamp-2 leading-tight">{displayBody}</p>
            </div>
          </div>
        </div>

        {/* Home Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/30 rounded-full" />
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[500px] aspect-video bg-zinc-900/50 rounded-xl border border-white/10 shadow-2xl overflow-hidden group">
      {/* Browser Bar */}
      <div className="h-8 bg-zinc-800 flex items-center px-3 gap-1.5 border-b border-white/5">
        <div className="h-2 w-2 rounded-full bg-red-500/50" />
        <div className="h-2 w-2 rounded-full bg-yellow-500/50" />
        <div className="h-2 w-2 rounded-full bg-green-500/50" />
        <div className="ml-4 h-4 w-32 bg-white/5 rounded-full" />
      </div>
      
      {/* Desktop Notification Toast (macOS style) */}
      <div className="absolute top-4 right-4 w-[320px] animate-in slide-in-from-right duration-500">
        <div className="bg-[#1c1c1e]/90 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-2xl flex gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
            {iconUrl ? (
              <img src={iconUrl} alt="" className="h-full w-full object-cover rounded-xl" />
            ) : (
              <Bell className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex justify-between items-center mb-1">
              <p className="text-xs font-bold text-white truncate">{displayTitle}</p>
              <span className="text-[9px] text-white/30 font-bold uppercase">now</span>
            </div>
            <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">{displayBody}</p>
            <div className="mt-2 flex gap-2">
              <div className="h-1.5 w-12 bg-primary/30 rounded-full" />
              <div className="h-1.5 w-8 bg-white/10 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
        <Monitor className="h-24 w-24" />
      </div>
    </div>
  );
}
