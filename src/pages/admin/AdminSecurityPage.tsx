import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  ShieldCheck, 
  Lock, 
  Activity, 
  Trash2, 
  Plus,
  Fingerprint,
  Zap,
  Globe,
  Loader2,
  ShieldAlert,
  RefreshCw
} from 'lucide-react';
import { 
  getFirewallRules, 
  createFirewallRule, 
  deleteFirewallRule, 
  getSecurityEvents, 
  getRateLimitLogs,
  getLoginAttempts,
  getSecurityAnalytics,
  getAdminMFALogs,
  disableMFA
} from '@/services/api';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

export default function AdminSecurityPage() {
  const [, setActiveTab] = useState('overview');
  const [firewallRules, setFirewallRules] = useState<any[]>([]);
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);
  const [rateLimits, setRateLimits] = useState<any[]>([]);
  const [loginAttempts, setLoginAttempts] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [mfaLogs, setMfaLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { profile, isAdmin, loading: authLoading } = useAuth();
  
  // New Rule Form State
  const [newRule, setNewRule] = useState({
    type: 'ip_block',
    value: '',
    description: '',
    target_endpoint: 'ALL',
    rate_limit_window: 60,
    rate_limit_max: 100,
    is_active: true
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const loadAllData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      // Individual requests to prevent cascading failures
      const rulesPromise = getFirewallRules().catch(e => { console.error(e); return []; });
      const eventsPromise = getSecurityEvents().catch(e => { console.error(e); return []; });
      const limitsPromise = getRateLimitLogs().catch(e => { console.error(e); return []; });
      const attemptsPromise = getLoginAttempts().catch(e => { console.error(e); return []; });
      const analyticsPromise = getSecurityAnalytics().catch(e => { console.error(e); return []; });
      const logsPromise = getAdminMFALogs().catch(e => { console.error(e); return []; });

      const [rules, events, limits, attempts, securityAnalytics, logs] = await Promise.all([
        rulesPromise,
        eventsPromise,
        limitsPromise,
        attemptsPromise,
        analyticsPromise,
        logsPromise
      ]);

      setFirewallRules(Array.isArray(rules) ? rules : []);
      setSecurityEvents(Array.isArray(events) ? events : []);
      setRateLimits(Array.isArray(limits) ? limits : []);
      setLoginAttempts(Array.isArray(attempts) ? attempts : []);
      setAnalytics(Array.isArray(securityAnalytics) ? securityAnalytics : []);
      setMfaLogs(Array.isArray(logs) ? logs : []);
      
      setError(null);
      if (isRefresh) toast.success('Security data updated live');
    } catch (err: unknown) {
      console.error('Failed to load security data:', err);
      setError((err as any).message || 'Partial failure loading security parameters');
      toast.error('Security handshake degraded');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAllData();
    }
    
    // Safety timeout to prevent infinite loading screen
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 10000); // 10 seconds max loading

    return () => clearTimeout(safetyTimeout);
  }, [isAdmin]);

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Authenticating Admin Session...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <ShieldAlert className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground italic">You do not have the required permissions to access the Security Center Intelligence portal.</p>
        </Card>
      </div>
    );
  }

  if (loading && !refreshing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Initializing Security Perimeter...</p>
      </div>
    );
  }

  if (error && !refreshing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <ShieldAlert className="h-12 w-12 text-red-500" />
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold">Security Module Error</h2>
          <p className="text-sm text-muted-foreground max-w-md">{error}</p>
        </div>
        <Button onClick={() => loadAllData()} className="mt-4 premium-gradient">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry Initialization
        </Button>
      </div>
    );
  }

  const handleCreateRule = async () => {
    if (!newRule.value) {
      toast.error('Please provide a value (IP/Geo Code) for the rule');
      return;
    }
    try {
      await createFirewallRule(newRule);
      toast.success('Firewall rule deployed successfully');
      setIsDialogOpen(false);
      setNewRule({ 
        type: 'ip_block', 
        value: '', 
        description: '', 
        target_endpoint: 'ALL', 
        rate_limit_window: 60, 
        rate_limit_max: 100, 
        is_active: true 
      });
      loadAllData();
    } catch (error) {
      toast.error('Failed to deploy firewall rule');
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to remove this firewall rule?')) return;
    try {
      await deleteFirewallRule(id);
      toast.success('Rule removed');
      loadAllData();
    } catch (error) {
      toast.error('Failed to remove rule');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };


  const LogDetailsDialog = ({ log }: { log: any }) => {
    if (!log) return null;
    const geo = log.geolocation;
    const device = log.device_fingerprint;

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-primary hover:bg-primary/5">
            Details
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Event Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {geo && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
                  <Globe className="h-4 w-4" />
                  Geolocation Data
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs bg-muted/30 p-4 rounded-xl border">
                  <div><span className="text-muted-foreground">Country:</span> {geo.country} ({geo.countryCode})</div>
                  <div><span className="text-muted-foreground">Region:</span> {geo.region}</div>
                  <div><span className="text-muted-foreground">City:</span> {geo.city}</div>
                  <div><span className="text-muted-foreground">ISP:</span> {geo.isp}</div>
                  <div><span className="text-muted-foreground">IP:</span> {geo.ip}</div>
                  <div><span className="text-muted-foreground">Coordinates:</span> {geo.latitude}, {geo.longitude}</div>
                </div>
              </div>
            )}
            
            {device && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
                  <Fingerprint className="h-4 w-4" />
                  Device Fingerprint
                </h3>
                <div className="grid grid-cols-1 gap-4 text-xs bg-muted/30 p-4 rounded-xl border">
                  <div><span className="text-muted-foreground">Browser:</span> {device.userAgent}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-muted-foreground">Platform:</span> {device.platform}</div>
                    <div><span className="text-muted-foreground">Language:</span> {device.language}</div>
                    <div><span className="text-muted-foreground">Resolution:</span> {device.screenResolution}</div>
                    <div><span className="text-muted-foreground">Timezone:</span> {device.timeZone}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Plugins:</span> 
                    <div className="mt-1 flex flex-wrap gap-1">
                      {device.plugins?.map((p: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-[9px] py-0">{p}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!geo && !device && (
              <p className="text-sm text-center text-muted-foreground py-10 italic">
                No enhanced security telemetry available for this event.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-xs font-bold uppercase tracking-widest opacity-50">Loading security center...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-4xl font-black v56-gradient-text tracking-tight leading-tight flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            Security <span className="text-foreground">& Firewall</span>
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-primary" />
            WAF, Intrusion Prevention & Access Control Center
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={() => loadAllData(true)} 
            className="flex-1 sm:flex-none h-12 rounded-xl border-primary/20 hover:bg-primary/5"
            disabled={refreshing}
          >
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
            Live Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1 sm:flex-none h-12 rounded-xl font-bold uppercase tracking-widest text-xs px-6">
                <Plus className="mr-2 h-4 w-4" />
                Deploy New Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="v56-glass border-primary/20">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black italic tracking-tighter">Deploy Firewall Rule</DialogTitle>
                <CardDescription>Add a new filter to the application perimeter.</CardDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Rule Type</Label>
                  <Select 
                    value={newRule.type} 
                    onValueChange={(val) => setNewRule({...newRule, type: val})}
                  >
                    <SelectTrigger className="v56-glass-input">
                      <SelectValue placeholder="Select rule type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ip_block">IP Block (Single Address)</SelectItem>
                      <SelectItem value="ip_range">IP CIDR Range Block</SelectItem>
                      <SelectItem value="geo_block">Geographic Block (Country Code)</SelectItem>
                      <SelectItem value="ip_whitelist">Admin IP Whitelist</SelectItem>
                      <SelectItem value="rate_limit">Rate Limit Rule</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newRule.type === 'rate_limit' && (
                  <>
                    <div className="space-y-2">
                      <Label>Target Endpoint</Label>
                      <Input 
                        placeholder="e.g. /api/withdraw or ALL" 
                        value={newRule.target_endpoint}
                        onChange={(e) => setNewRule({...newRule, target_endpoint: e.target.value})}
                        className="v56-glass-input"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Window (Seconds)</Label>
                        <Input 
                          type="number"
                          value={newRule.rate_limit_window}
                          onChange={(e) => setNewRule({...newRule, rate_limit_window: parseInt(e.target.value)})}
                          className="v56-glass-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Max Requests</Label>
                        <Input 
                          type="number"
                          value={newRule.rate_limit_max}
                          onChange={(e) => setNewRule({...newRule, rate_limit_max: parseInt(e.target.value)})}
                          className="v56-glass-input"
                        />
                      </div>
                    </div>
                  </>
                )}
                {newRule.type !== 'rate_limit' && (
                  <div className="space-y-2">
                    <Label>Value (IP or ISO Code)</Label>
                    <Input 
                      placeholder="e.g. 192.168.1.1 or US" 
                      value={newRule.value}
                      onChange={(e) => setNewRule({...newRule, value: e.target.value})}
                      className="v56-glass-input"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Description / Reason</Label>
                  <Input 
                    placeholder="e.g. Repeated failed login attempts" 
                    value={newRule.description}
                    onChange={(e) => setNewRule({...newRule, description: e.target.value})}
                    className="v56-glass-input"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateRule} className="premium-gradient">Confirm Deployment</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="overview" onValueChange={setActiveTab} className="space-y-8">
        <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
          <TabsList className="inline-flex h-12 items-center justify-start rounded-xl bg-muted/50 p-1 text-muted-foreground w-max sm:w-full sm:grid sm:grid-cols-6 border border-white/5">
            <TabsTrigger value="overview" className="rounded-lg h-10 px-6 font-bold uppercase tracking-widest text-[10px]">
              Overview
            </TabsTrigger>
            <TabsTrigger value="firewall" className="rounded-lg h-10 px-6 font-bold uppercase tracking-widest text-[10px]">
              Firewall Rules
            </TabsTrigger>
            <TabsTrigger value="events" className="rounded-lg h-10 px-6 font-bold uppercase tracking-widest text-[10px]">
              WAF Events
            </TabsTrigger>
            <TabsTrigger value="rate-limits" className="rounded-lg h-10 px-6 font-bold uppercase tracking-widest text-[10px]">
              Rate Limits
            </TabsTrigger>
            <TabsTrigger value="login-attempts" className="rounded-lg h-10 px-6 font-bold uppercase tracking-widest text-[10px]">
              Login Attempts
            </TabsTrigger>
            <TabsTrigger value="mfa-logs" className="rounded-lg h-10 px-6 font-bold uppercase tracking-widest text-[10px]">
              Security Logs
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="login-attempts" className="space-y-6">
           <Card className="v56-glass premium-border rounded-3xl overflow-hidden">
             <CardHeader className="p-8 border-b border-white/5 bg-white/5">
                <CardTitle className="text-xl font-black flex items-center gap-3">
                  <Fingerprint className="h-5 w-5 text-primary" />
                  Auth Security Log
                </CardTitle>
                <CardDescription>Failed login attempts and potential account lockouts.</CardDescription>
             </CardHeader>
             <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-white/5">
                      <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="py-6 pl-8 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Identity / IP</TableHead>
                        <TableHead className="py-6 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Time</TableHead>
                        <TableHead className="py-6 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Status</TableHead>
                        <TableHead className="py-6 pr-8 font-black uppercase tracking-widest text-[10px] text-muted-foreground text-right">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loginAttempts.map((attempt) => (
                        <TableRow key={attempt.id} className="border-white/5 hover:bg-white/5 transition-colors">
                          <TableCell className="py-6 pl-8">
                            <div className="space-y-1">
                              <p className="font-bold text-sm">{attempt.email || attempt.user_id || 'Anonymous'}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{attempt.ip_address || 'Unknown IP'}</p>
                                {attempt.geolocation && (
                                  <Badge variant="outline" className="text-[8px] h-4 py-0 bg-primary/5 border-primary/10">
                                    {attempt.geolocation.countryCode || attempt.geolocation.city}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-6 text-xs tabular-nums text-muted-foreground">
                            {attempt.attempt_time ? format(new Date(attempt.attempt_time), 'MMM dd, HH:mm:ss') : 'N/A'}
                          </TableCell>
                          <TableCell className="py-6">
                            <Badge variant="outline" className={attempt.success ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}>
                              {attempt.success ? "SUCCESS" : "FAILED"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-6 pr-8 text-right">
                            <LogDetailsDialog log={attempt} />
                          </TableCell>
                        </TableRow>
                      ))}
                      {loginAttempts.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="py-20 text-center text-muted-foreground italic text-sm">
                            No login attempts recorded.
                          </TableCell>
                        </TableRow>
                      )}
                  </TableBody>
                </Table>
             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="mfa-logs" className="space-y-6">
           <Card className="v56-glass premium-border rounded-3xl overflow-hidden">
             <CardHeader className="p-8 border-b border-white/5 bg-white/5">
                <CardTitle className="text-xl font-black flex items-center gap-3">
                  <Fingerprint className="h-5 w-5 text-primary" />
                  Admin Security Events
                </CardTitle>
                <CardDescription>Administrative tracking of login activity and security changes.</CardDescription>
             </CardHeader>
             <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="py-6 pl-8 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Admin / IP</TableHead>
                      <TableHead className="py-6 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Event Type</TableHead>
                      <TableHead className="py-6 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Time</TableHead>
                      <TableHead className="py-6 pr-8 font-black uppercase tracking-widest text-[10px] text-muted-foreground text-right">Outcome</TableHead>
                      <TableHead className="py-6 pr-8 font-black uppercase tracking-widest text-[10px] text-muted-foreground text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mfaLogs.map((log) => (
                      <TableRow key={log.id} className="border-white/5 hover:bg-white/5 transition-colors">
                        <TableCell className="py-6 pl-8">
                          <div className="space-y-1">
                            <p className="font-bold text-sm">{log.profiles?.full_name || log.profiles?.email || 'Admin'}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{log.ip_address || '127.0.0.1'}</p>
                              {log.geolocation && (
                                <Badge variant="outline" className="text-[8px] h-4 py-0 bg-primary/5 border-primary/10">
                                  {log.geolocation.countryCode || log.geolocation.city}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-6">
                          <Badge variant="outline" className="bg-primary/5 border-primary/10 text-primary capitalize font-bold text-[10px]">
                            {log.event_type.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-6 text-xs tabular-nums text-muted-foreground">
                          {log.created_at ? format(new Date(log.created_at), 'MMM dd, HH:mm:ss') : 'N/A'}
                        </TableCell>
                        <TableCell className="py-6 pr-8 text-right">
                          <Badge variant="outline" className={log.outcome === 'success' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}>
                            {log.outcome.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-6 pr-8 text-right">
                          <LogDetailsDialog log={log} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {mfaLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-20 text-center text-muted-foreground italic text-sm">
                          No MFA security events recorded.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="v56-glass premium-border rounded-3xl overflow-hidden">
                <CardHeader className="p-6 border-b border-white/5 bg-primary/5">
                  <CardTitle className="text-sm font-black flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    MFA Protection
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Admin Status</span>
                    <Badge variant="outline" className={profile?.mfa_enabled ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}>
                      {profile?.mfa_enabled ? "ENFORCED" : "INSECURE"}
                    </Badge>
                  </div>
                  {profile?.mfa_enabled ? (
                    <Button 
                      variant="outline" 
                      className="w-full h-10 text-xs border-red-500/20 text-red-500 hover:bg-red-500/5 hover:text-red-500"
                      onClick={async () => {
                        if (confirm('Are you sure you want to disable MFA? This will reduce your account security.')) {
                          try {
                            await disableMFA(profile.id);
                            toast.success('MFA disabled successfully');
                            window.location.reload(); 
                          } catch (e) {
                            toast.error('Failed to disable MFA');
                          }
                        }
                      }}
                    >
                      Disable MFA
                    </Button>
                  ) : (
                    <Button asChild variant="outline" className="w-full h-10 text-xs">
                      <a href="/admin/mfa-setup">Configure MFA</a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="v56-glass premium-border rounded-3xl overflow-hidden">
                <CardHeader className="p-6 border-b border-white/5 bg-red-500/5">
                  <CardTitle className="text-sm font-black flex items-center gap-2">
                    <Lock className="h-4 w-4 text-red-500" />
                    IP Bans
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-3xl font-black">{firewallRules.filter(r => r.type === 'ip_block').length}</div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Active Perimeter Blocks</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="v56-glass premium-border rounded-3xl overflow-hidden">
                <CardHeader className="p-6 border-b border-white/5 bg-amber-500/5">
                  <CardTitle className="text-sm font-black flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    WAF Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-3xl font-black">{securityEvents.length}</div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Detections (24h)</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="v56-glass premium-border rounded-3xl overflow-hidden">
                <CardHeader className="p-6 border-b border-white/5 bg-blue-500/5">
                  <CardTitle className="text-sm font-black flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-500" />
                    Threat Origin
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-3xl font-black">
                    {new Set((securityEvents || []).map(e => e?.ip_address).filter(Boolean)).size}
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Unique IPs Flagged</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="v56-glass premium-border rounded-3xl overflow-hidden">
              <CardHeader className="p-8 border-b border-white/5">
                <CardTitle className="text-xl font-black">Traffic & Threat Trends</CardTitle>
                <CardDescription>Visualizing security events over the last 30 days.</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis 
                        dataKey="event_date" 
                        stroke="rgba(255,255,255,0.3)" 
                        fontSize={10}
                        tickFormatter={(str) => {
                          try {
                            return format(new Date(str), 'MMM d');
                          } catch (e) {
                            return str;
                          }
                        }}
                      />
                      <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(212, 175, 55, 0.2)', borderRadius: '12px' }}
                        itemStyle={{ color: '#D4AF37' }}
                      />
                      <Line type="monotone" dataKey="event_count" stroke="#D4AF37" strokeWidth={3} dot={{ r: 4, fill: '#D4AF37' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="v56-glass premium-border rounded-3xl overflow-hidden">
              <CardHeader className="p-8 border-b border-white/5">
                <CardTitle className="text-xl font-black">Event Distribution</CardTitle>
                <CardDescription>Breakdown of security event types.</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'WAF Blocks', value: securityEvents.filter(e => e.event_type === 'waf_block').length },
                          { name: 'Rate Limits', value: securityEvents.filter(e => e.event_type === 'rate_limit_exceeded').length },
                          { name: 'API Requests', value: securityEvents.filter(e => e.event_type === 'api_request').length },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="#D4AF37" />
                        <Cell fill="#FFD700" />
                        <Cell fill="#3B82F6" />
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(212, 175, 55, 0.2)', borderRadius: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#D4AF37]" />
                    <span className="text-xs text-muted-foreground">WAF Blocks</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#FFD700]" />
                    <span className="text-xs text-muted-foreground">Rate Limits</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#3B82F6]" />
                    <span className="text-xs text-muted-foreground">API Req</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="firewall">
           <Card className="v56-glass premium-border overflow-hidden">
             <div className="overflow-x-auto">
               <Table>
                 <TableHeader>
                   <TableRow className="border-white/5 hover:bg-transparent">
                     <TableHead className="text-[10px] uppercase font-black tracking-widest text-muted-foreground py-6 pl-8">Type</TableHead>
                     <TableHead className="text-[10px] uppercase font-black tracking-widest text-muted-foreground py-6">Target Value</TableHead>
                     <TableHead className="text-[10px] uppercase font-black tracking-widest text-muted-foreground py-6">Description</TableHead>
                     <TableHead className="text-[10px] uppercase font-black tracking-widest text-muted-foreground py-6">Status</TableHead>
                     <TableHead className="text-[10px] uppercase font-black tracking-widest text-muted-foreground py-6 text-right pr-8">Actions</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {firewallRules.map((rule) => (
                     <TableRow key={rule.id} className="border-white/5 hover:bg-white/5 group">
                       <TableCell className="pl-8">
                         <Badge variant="outline" className="bg-primary/5 border-primary/10 text-primary capitalize">
                           {rule.type.replace('_', ' ')}
                         </Badge>
                       </TableCell>
                       <TableCell className="font-mono font-bold">{rule.value}</TableCell>
                       <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{rule.description}</TableCell>
                       <TableCell>
                         <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${rule.is_active ? 'bg-green-500 animate-pulse' : 'bg-muted'}`} />
                           <span className="text-[10px] font-black uppercase tracking-widest">{rule.is_active ? 'Active' : 'Disabled'}</span>
                         </div>
                       </TableCell>
                       <TableCell className="text-right pr-8">
                         <Button variant="ghost" size="icon" className="hover:text-destructive transition-colors" onClick={() => handleDeleteRule(rule.id)}>
                           <Trash2 className="h-4 w-4" />
                         </Button>
                       </TableCell>
                     </TableRow>
                   ))}
                   {firewallRules.length === 0 && (
                     <TableRow>
                       <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">No firewall rules currently active.</TableCell>
                     </TableRow>
                   )}
                 </TableBody>
               </Table>
             </div>
           </Card>
        </TabsContent>

        <TabsContent value="events">
           <Card className="v56-glass premium-border overflow-hidden">
             <div className="overflow-x-auto">
               <Table>
                 <TableHeader>
                   <TableRow className="border-white/5 hover:bg-transparent">
                     <TableHead className="text-[10px] uppercase font-black tracking-widest text-muted-foreground py-6 pl-8">Event</TableHead>
                     <TableHead className="text-[10px] uppercase font-black tracking-widest text-muted-foreground py-6">Identity / IP</TableHead>
                     <TableHead className="text-[10px] uppercase font-black tracking-widest text-muted-foreground py-6">Endpoint</TableHead>
                     <TableHead className="text-[10px] uppercase font-black tracking-widest text-muted-foreground py-6">Time</TableHead>
                     <TableHead className="text-[10px] uppercase font-black tracking-widest text-muted-foreground py-6 text-right pr-8">Severity</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {securityEvents.map((event) => (
                     <TableRow key={event.id} className="border-white/5 hover:bg-white/5">
                       <TableCell className="pl-8">
                         <div className="space-y-1">
                           <p className="font-bold text-xs">{event.event_type.replace('_', ' ').toUpperCase()}</p>
                           <p className="text-[10px] text-muted-foreground max-w-xs truncate">{event.description}</p>
                         </div>
                       </TableCell>
                       <TableCell>
                         <div className="flex flex-col">
                           <span className="font-mono text-[10px] font-bold">{event.ip_address}</span>
                           <span className="text-[10px] text-muted-foreground">{event.user?.email || 'Guest Session'}</span>
                         </div>
                       </TableCell>
                       <TableCell>
                         <span className="text-xs bg-muted/50 px-2 py-1 rounded border border-white/5 font-mono">{event.endpoint || '/'}</span>
                       </TableCell>
                       <TableCell className="text-xs">
                         {event.created_at ? format(new Date(event.created_at), 'MMM dd, HH:mm:ss') : 'N/A'}
                       </TableCell>
                       <TableCell className="text-right pr-8">
                         <Badge variant="outline" className={getSeverityColor(event.severity)}>
                           {event.severity.toUpperCase()}
                         </Badge>
                       </TableCell>
                     </TableRow>
                   ))}
                   {securityEvents.length === 0 && (
                     <TableRow>
                       <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">Clean logs. No security events found.</TableCell>
                     </TableRow>
                   )}
                 </TableBody>
               </Table>
             </div>
           </Card>
        </TabsContent>

        <TabsContent value="rate-limits">
           <Card className="v56-glass premium-border overflow-hidden">
             <div className="overflow-x-auto">
               <Table>
                 <TableHeader>
                   <TableRow className="border-white/5 hover:bg-transparent">
                     <TableHead className="text-[10px] uppercase font-black tracking-widest text-muted-foreground py-6 pl-8">Identifier (IP/User)</TableHead>
                     <TableHead className="text-[10px] uppercase font-black tracking-widest text-muted-foreground py-6">Target Endpoint</TableHead>
                     <TableHead className="text-[10px] uppercase font-black tracking-widest text-muted-foreground py-6">Timestamp</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {rateLimits.map((log) => (
                     <TableRow key={log.id} className="border-white/5 hover:bg-white/5">
                       <TableCell className="pl-8">
                         <span className="font-mono font-bold text-xs">{log.identifier}</span>
                       </TableCell>
                       <TableCell>
                         <Badge variant="secondary" className="font-mono text-[10px] uppercase">{log.endpoint}</Badge>
                       </TableCell>
                       <TableCell className="text-xs">
                         {log.created_at ? format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss') : 'N/A'}
                       </TableCell>
                     </TableRow>
                   ))}
                   {rateLimits.length === 0 && (
                     <TableRow>
                       <TableCell colSpan={3} className="text-center py-20 text-muted-foreground italic">No rate limit violations logged.</TableCell>
                     </TableRow>
                   )}
                 </TableBody>
               </Table>
             </div>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
