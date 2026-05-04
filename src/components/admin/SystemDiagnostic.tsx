import { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Database, 
  Globe, 
  Shield, 
  Server,
  Terminal,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/services/supabase';
import { toast } from 'sonner';

interface DiagnosticResult {
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'testing';
  latency?: number;
  message?: string;
  icon: any;
}

export function SystemDiagnostic() {
  const [results, setResults] = useState<DiagnosticResult[]>([
    { name: 'Database Connection', status: 'testing', icon: Database },
    { name: 'Auth Service', status: 'testing', icon: Shield },
    { name: 'Realtime WebSocket', status: 'testing', icon: Activity },
    { name: 'Edge Functions', status: 'testing', icon: Server },
    { name: 'Storage Buckets', status: 'testing', icon: Globe },
  ]);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [running, setRunning] = useState(false);

  const runDiagnostics = async () => {
    setRunning(true);
    const newResults = [...results].map(r => ({ ...r, status: 'testing' as const, message: undefined, latency: undefined }));
    setResults(newResults);

    // 1. Database Connection
    const dbStart = Date.now();
    try {
      const { error } = await supabase.from('platform_settings' as any).select('count', { count: 'exact', head: true } as any);
      if (error) throw error;
      updateResult('Database Connection', 'healthy', Date.now() - dbStart);
    } catch (e: unknown) {
      updateResult('Database Connection', 'error', undefined, (e as any).message);
    }

    // 2. Auth Service
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      updateResult('Auth Service', 'healthy', undefined, session ? 'Authenticated' : 'Public Access OK');
    } catch (e: unknown) {
      updateResult('Auth Service', 'error', undefined, (e as any).message);
    }

    // 3. Realtime WebSocket
    try {
      const channel = supabase.channel('health-check');
      const subStart = Date.now();
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          updateResult('Realtime WebSocket', 'healthy', Date.now() - subStart);
          supabase.removeChannel(channel);
        } else if (status === 'CHANNEL_ERROR') {
          updateResult('Realtime WebSocket', 'error', undefined, 'WebSocket Connection Failed');
        }
      });
      // Timeout for WS
      setTimeout(() => {
        setResults(prev => prev.map(r => 
          r.name === 'Realtime WebSocket' && r.status === 'testing' 
            ? { ...r, status: 'warning', message: 'Connection Timeout' } 
            : r
        ));
      }, 5000);
    } catch (e: unknown) {
      updateResult('Realtime WebSocket', 'error', undefined, (e as any).message);
    }

    // 4. Edge Functions
    try {
      const { error } = await supabase.functions.invoke('hello-world');
      // If hello-world doesn't exist, it might return 404, but we just check if service responds
      if (error && (error as any).message.includes('not found')) {
        updateResult('Edge Functions', 'warning', undefined, 'Function service active, hello-world not found');
      } else if (error) {
        throw error;
      } else {
        updateResult('Edge Functions', 'healthy');
      }
    } catch (e: unknown) {
      updateResult('Edge Functions', 'error', undefined, (e as any).message);
    }

    // 5. Storage Buckets
    try {
      const { data, error } = await supabase.storage.listBuckets();
      if (error) throw error;
      const announcementsExists = (data || []).find(b => b.name === 'announcements');
      updateResult('Storage Buckets', announcementsExists ? 'healthy' : 'warning', undefined, announcementsExists ? 'All buckets available' : 'announcements bucket missing');
    } catch (e: unknown) {
      updateResult('Storage Buckets', 'error', undefined, (e as any).message);
    }

    setLastCheck(new Date());
    setRunning(false);
    toast.success('System diagnostics complete');
  };

  const updateResult = (name: string, status: DiagnosticResult['status'], latency?: number, message?: string) => {
    setResults(prev => prev.map(r => r.name === name ? { ...r, status, latency, message } : r));
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'error': return <XCircle className="h-4 w-4" />;
      case 'testing': return <RefreshCw className="h-4 w-4 animate-spin" />;
      default: return null;
    }
  };

  return (
    <Card className="v56-glass premium-border overflow-hidden">
      <CardHeader className="bg-primary/5 border-b border-white/5 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            System Health & Diagnostics
          </CardTitle>
          <CardDescription className="text-[10px] uppercase font-bold tracking-widest opacity-60">
            Real-time infrastructure status monitoring
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={runDiagnostics} 
          disabled={running}
          className="premium-border rounded-xl h-8 px-4 font-black uppercase tracking-widest text-[9px]"
        >
          <RefreshCw className={cn("h-3 w-3 mr-2", running && "animate-spin")} />
          Run Check
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-white/5">
          {results.map((r, i) => (
            <div key={i} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-2 rounded-lg border",
                  r.status === 'healthy' ? "bg-green-500/10 border-green-500/20" : 
                  r.status === 'error' ? "bg-red-500/10 border-red-500/20" :
                  r.status === 'warning' ? "bg-yellow-500/10 border-yellow-500/20" :
                  "bg-white/5 border-white/10"
                )}>
                  <r.icon className={cn("h-5 w-5", getStatusColor(r.status))} />
                </div>
                <div>
                  <h4 className="font-bold text-sm">{r.name}</h4>
                  {r.message && <p className="text-[10px] text-muted-foreground">{r.message}</p>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline" className={cn(
                  "text-[9px] uppercase font-black flex items-center gap-1",
                  r.status === 'healthy' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                  r.status === 'error' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                  r.status === 'warning' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                  "bg-white/10 text-muted-foreground border-white/20"
                )}>
                  {getStatusIcon(r.status)}
                  {r.status}
                </Badge>
                {r.latency !== undefined && (
                  <span className="text-[9px] font-mono text-muted-foreground flex items-center gap-1">
                    <Clock className="h-2 w-2" />
                    {r.latency}ms
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 bg-black/20 border-t border-white/5 flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <Terminal className="h-3 w-3" />
            <span>Environment: <span className="text-foreground font-bold">{import.meta.env.MODE}</span></span>
          </div>
          {lastCheck && (
            <span>Last update: {lastCheck.toLocaleTimeString()}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import { cn } from '@/utils/utils';
