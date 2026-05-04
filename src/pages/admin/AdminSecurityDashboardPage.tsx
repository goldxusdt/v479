import { Shield, ShieldAlert, ShieldCheck, Activity, Fingerprint, Loader2, RefreshCw, ChevronRight, Download, BarChart3, Lock, AlertTriangle } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, subHours, startOfHour } from 'date-fns';
import { SEOHead } from '@/utils/seo';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export default function AdminSecurityDashboardPage() {
  const { } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const timeRange = 24; // hours

  useEffect(() => {
    loadSecurityData();
    
    const interval = setInterval(() => {
      loadSecurityData(true);
    }, 30000); // Auto refresh every 30s
    
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadSecurityData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setRefreshing(true);
    
    try {
      const startTime = subHours(new Date(), timeRange).toISOString();
      
      const [logsRes, eventsRes] = await Promise.all([
        supabase
          .from('admin_security_logs')
          .select('*')
          .gt('created_at', startTime)
          .order('created_at', { ascending: false }),
        supabase
          .from('security_events')
          .select('*')
          .gt('created_at', startTime)
          .order('created_at', { ascending: false })
      ]);
      
      if (logsRes.error) throw logsRes.error;
      if (eventsRes.error) throw eventsRes.error;

      setLogs(logsRes.data || []);
      setEvents(eventsRes.data || []);
    } catch (error) {
      toast.error('Failed to load security dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const chartData = useMemo(() => {
    const hours = Array.from({ length: timeRange }, (_, i) => {
      const d = subHours(new Date(), i);
      return startOfHour(d);
    }).reverse();

    return hours.map(hour => {
      const hourLogs = logs.filter(log => {
        const logDate = new Date(log.created_at);
        return startOfHour(logDate).getTime() === hour.getTime();
      });

      return {
        time: format(hour, 'HH:00'),
        success: hourLogs.filter(l => l.outcome === 'success').length,
        failure: hourLogs.filter(l => l.outcome === 'failure').length,
      };
    });
  }, [logs, timeRange]);

  const stats = useMemo(() => {
    const total = logs.length;
    const successes = logs.filter(l => l.outcome === 'success').length;
    const failures = logs.filter(l => l.outcome === 'failure').length;
    const successRate = total > 0 ? (successes / total) * 100 : 100;

    return { total, successes, failures, successRate };
  }, [logs]);

  const bruteForceThreats = useMemo(() => {
    // Detect potential brute force: 5+ failures within any 5-minute window for a specific admin or IP
    const failures = logs.filter(l => l.outcome === 'failure');
    const threats: any[] = [];
    
    // Group by admin_id and IP
    const groups: Record<string, any[]> = {};
    failures.forEach(log => {
      const key = `${log.admin_id || 'unknown'}-${log.ip_address}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(log);
    });

    Object.values(groups).forEach(groupLogs => {
      if (groupLogs.length >= 5) {
        // Sort by time
        groupLogs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        // Check 5-minute windows
        for (let i = 0; i < groupLogs.length - 4; i++) {
          const windowStart = new Date(groupLogs[i].created_at);
          const windowEnd = new Date(groupLogs[i+4].created_at);
          const durationMinutes = (windowEnd.getTime() - windowStart.getTime()) / 60000;
          
          if (durationMinutes <= 5) {
            threats.push({
              admin_id: groupLogs[i].admin_id,
              ip_address: groupLogs[i].ip_address,
              failureCount: groupLogs.length,
              lastSeen: groupLogs[groupLogs.length - 1].created_at,
              severity: groupLogs.length >= 10 ? 'CRITICAL' : 'HIGH'
            });
            break;
          }
        }
      }
    });

    return threats;
  }, [logs]);

  const handleLockAccount = async (adminId: string) => {
    if (!adminId || adminId === 'unknown') {
      toast.error('Cannot lock unknown admin account');
      return;
    }

    try {
      const { error } = await (supabase.from('profiles') as any)
        .update({
          mfa_locked_until: subHours(new Date(), -24).toISOString() // Lock for 24h
        })
        .eq('id', adminId);

      if (error) throw error;
      toast.success('Account locked successfully');
      loadSecurityData(true);
    } catch (error) {
      toast.error('Failed to lock account');
    }
  };

  const exportSecurityReport = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.setTextColor(212, 175, 55);
      doc.text('Gold X Usdt - Security Intelligence Report', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm:ss')}`, 14, 28);
      doc.text(`Time Range: Last ${timeRange} hours`, 14, 34);

      autoTable(doc, {
        startY: 45,
        head: [['Metric', 'Value']],
        body: [
          ['Total 2FA Attempts', stats.total],
          ['Successful Verifications', stats.successes],
          ['Failed Attempts', stats.failures],
          ['Security Health Score', `${stats.successRate.toFixed(1)}%`],
          ['Potential Threats Detected', bruteForceThreats.length]
        ],
        theme: 'striped',
        headStyles: { fillColor: [212, 175, 55] }
      });

      if (bruteForceThreats.length > 0) {
        doc.text('Detected Security Threats', 14, (doc as any).lastAutoTable.finalY + 15);
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 20,
          head: [['Admin ID', 'IP Address', 'Failures', 'Last Seen', 'Severity']],
          body: bruteForceThreats.map(t => [
            t.admin_id || 'Unknown',
            t.ip_address,
            t.failureCount,
            format(new Date(t.lastSeen), 'MMM dd, HH:mm'),
            t.severity
          ]),
          theme: 'grid',
          headStyles: { fillColor: [220, 38, 38] }
        });
      }

      doc.save(`security-report-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`);
      toast.success('Security report exported to PDF');
    } catch (error) {
      toast.error('Failed to generate report');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const handleRefresh = async () => {
    await loadSecurityData(true);
    toast.success('Security Intelligence Updated');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-8 max-w-7xl mx-auto">
      <SEOHead title="Security Intelligence Dashboard - Admin" noindex={true} />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-4xl font-black v56-gradient-text tracking-tight leading-tight flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            Security <span className="text-foreground">Intelligence</span>
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            24-Hour Behavioral Analysis & Threat Intelligence
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            className="flex-1 sm:flex-none h-12 rounded-xl border-primary/20 hover:bg-primary/5"
            disabled={refreshing}
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
          <Button 
            onClick={exportSecurityReport} 
            className="flex-1 sm:flex-none h-12 rounded-xl font-bold uppercase tracking-widest text-xs px-6 premium-gradient"
          >
            <Download className="mr-2 h-4 w-4" />
            Export Intelligence
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="v56-glass premium-border rounded-3xl overflow-hidden">
          <CardHeader className="p-6 border-b border-white/5 bg-primary/5">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Fingerprint className="h-4 w-4 text-primary" />
              Total Attempts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
             <div className="text-3xl font-black">{stats.total}</div>
             <p className="text-[10px] text-muted-foreground uppercase mt-1">Last {timeRange} hours</p>
          </CardContent>
        </Card>

        <Card className="v56-glass premium-border rounded-3xl overflow-hidden border-green-500/20">
          <CardHeader className="p-6 border-b border-white/5 bg-green-500/5">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-green-500 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
             <div className="text-3xl font-black text-green-500">{stats.successRate.toFixed(1)}%</div>
             <p className="text-[10px] text-muted-foreground uppercase mt-1">Verified access</p>
          </CardContent>
        </Card>

        <Card className="v56-glass premium-border rounded-3xl overflow-hidden border-red-500/20">
          <CardHeader className="p-6 border-b border-white/5 bg-red-500/5">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-red-500 flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Failures
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
             <div className="text-3xl font-black text-red-500">{stats.failures}</div>
             <p className="text-[10px] text-muted-foreground uppercase mt-1">Blocked attempts</p>
          </CardContent>
        </Card>

        <Card className="v56-glass premium-border rounded-3xl overflow-hidden border-amber-500/20">
          <CardHeader className="p-6 border-b border-white/5 bg-amber-500/5">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Active Threats
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
             <div className="text-3xl font-black text-amber-500">{bruteForceThreats.length}</div>
             <p className="text-[10px] text-muted-foreground uppercase mt-1">Potential brute-force</p>
          </CardContent>
        </Card>
      </div>

      <Card className="v56-glass premium-border rounded-3xl overflow-hidden">
        <CardHeader className="p-8 border-b border-white/5 bg-white/5">
           <CardTitle className="text-xl font-black">2FA Attempt Trends</CardTitle>
           <CardDescription>Behavioral analysis of administrative access attempts.</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
           <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorFailure" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="time" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#888', fontSize: 10 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#888', fontSize: 10 }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="top" height={36}/>
                  <Area 
                    type="monotone" 
                    dataKey="success" 
                    name="Success" 
                    stroke="#22c55e" 
                    fillOpacity={1} 
                    fill="url(#colorSuccess)" 
                    strokeWidth={3}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="failure" 
                    name="Failure" 
                    stroke="#ef4444" 
                    fillOpacity={1} 
                    fill="url(#colorFailure)" 
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="v56-glass premium-border rounded-3xl overflow-hidden">
          <CardHeader className="p-8 border-b border-white/5 bg-white/5 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-black flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Brute-Force Intelligence
              </CardTitle>
              <CardDescription>Identifying multiple failed attempts from single sources.</CardDescription>
            </div>
            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
              {bruteForceThreats.length} THREATS
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
             <Table>
               <TableHeader className="bg-white/5">
                 <TableRow className="border-white/5">
                   <TableHead className="py-4 pl-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Source IP / Admin</TableHead>
                   <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Failures</TableHead>
                   <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Action</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {bruteForceThreats.map((threat, idx) => (
                   <TableRow key={idx} className="border-white/5 hover:bg-white/5 transition-colors">
                     <TableCell className="py-4 pl-8">
                        <div className="space-y-0.5">
                          <p className="font-bold text-xs">{threat.ip_address}</p>
                          <p className="text-[9px] text-muted-foreground uppercase">{threat.admin_id || 'Guest/Unknown'}</p>
                        </div>
                     </TableCell>
                     <TableCell className="py-4">
                        <Badge variant="outline" className={threat.severity === 'CRITICAL' ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}>
                          {threat.failureCount} ATTEMPTS
                        </Badge>
                     </TableCell>
                     <TableCell className="py-4 pr-8 text-right">
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          className="h-8 text-[10px] font-black uppercase tracking-widest"
                          onClick={() => handleLockAccount(threat.admin_id)}
                          disabled={!threat.admin_id || threat.admin_id === 'unknown'}
                        >
                          Lock Account
                        </Button>
                     </TableCell>
                   </TableRow>
                 ))}
                 {bruteForceThreats.length === 0 && (
                   <TableRow>
                     <TableCell colSpan={3} className="py-12 text-center text-muted-foreground italic text-xs">
                       No suspicious patterns detected in the current window.
                     </TableCell>
                   </TableRow>
                 )}
               </TableBody>
             </Table>
          </CardContent>
        </Card>

        <Card className="v56-glass premium-border rounded-3xl overflow-hidden">
          <CardHeader className="p-8 border-b border-white/5 bg-white/5">
             <CardTitle className="text-xl font-black flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-primary" />
                Intelligence Log
             </CardTitle>
             <CardDescription>Recent security events requiring review.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
             <Table>
               <TableBody>
                 {logs.slice(0, 8).map((log) => (
                   <TableRow key={log.id} className="border-white/5 hover:bg-white/5 transition-colors">
                     <TableCell className="py-4 pl-8">
                        <div className="flex items-center gap-3">
                           <div className={`h-8 w-8 rounded-full flex items-center justify-center ${log.outcome === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                              {log.outcome === 'success' ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                           </div>
                           <div className="space-y-0.5">
                              <p className="font-bold text-xs uppercase tracking-tight">{log.event_type.replace(/_/g, ' ')}</p>
                              <p className="text-[9px] text-muted-foreground">{format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}</p>
                           </div>
                        </div>
                     </TableCell>
                     <TableCell className="py-4 pr-8 text-right">
                        <p className="text-[10px] font-mono text-muted-foreground">{log.ip_address}</p>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
             <div className="p-4 border-t border-white/5 text-center">
                <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                   View Full Audit Log <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
             </div>
          </CardContent>
        </Card>
      </div>
      <Card className="v56-glass premium-border rounded-3xl overflow-hidden mt-8">
        <CardHeader className="p-8 border-b border-white/5 bg-white/5 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-black">WAF & System Security Events</CardTitle>
            <CardDescription>Real-time detection of SQLi, XSS, and unauthorized access attempts.</CardDescription>
          </div>
          <Badge variant="outline" className="h-8 rounded-lg bg-primary/5 text-primary border-primary/20">
            {events.length} Events Detected
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-white/5">
                  <TableHead className="w-[180px] font-bold uppercase text-[10px]">Timestamp</TableHead>
                  <TableHead className="font-bold uppercase text-[10px]">Type</TableHead>
                  <TableHead className="font-bold uppercase text-[10px]">Severity</TableHead>
                  <TableHead className="font-bold uppercase text-[10px]">Description</TableHead>
                  <TableHead className="font-bold uppercase text-[10px]">IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No security threats detected in the last {timeRange} hours. System status: SECURE.
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((event) => (
                    <TableRow key={event.id} className="border-white/5 hover:bg-white/5 group">
                      <TableCell className="text-xs font-mono">
                        {format(new Date(event.created_at), 'MMM dd, HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={`rounded-md uppercase text-[9px] font-black ${
                            event.event_type === 'attack_blocked' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                            'bg-blue-500/10 text-blue-500 border-blue-500/20'
                          }`}
                        >
                          {event.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={`rounded-md uppercase text-[9px] font-black ${
                            event.severity === 'critical' ? 'bg-red-600 text-white' : 
                            event.severity === 'high' ? 'bg-red-500/10 text-red-500' :
                            'bg-amber-500/10 text-amber-500'
                          }`}
                        >
                          {event.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-xs truncate font-medium">
                        {event.description}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {event.ip_address}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
