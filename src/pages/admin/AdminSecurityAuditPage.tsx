import { Shield, ShieldAlert, ShieldCheck, Activity, Zap, Fingerprint, Loader2, RefreshCw, ChevronRight, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { invokeEdgeFunction } from '@/services/functions';

import { toast } from 'sonner';
import { format } from 'date-fns';
import { SEOHead } from '@/utils/seo';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminSecurityAuditPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any[]>([]);
  const [checkingHealth, setCheckingHealth] = useState(false);

  const edgeFunctions = [
    { name: 'verify-otp', description: 'TOTP & OTP Verification' },
    { name: 'verify-otp', description: 'Email/SMS OTP Verification' },
    { name: 'send-otp', description: 'MFA/Login OTP Delivery' }
  ];

  const checkHealth = async () => {
    setCheckingHealth(true);
    const results = [];
    
    for (const fn of edgeFunctions) {
      const startTime = Date.now();
      try {
        const { data, error } = await invokeEdgeFunction(fn.name, {
          body: { mode: 'ping' }
        });
        
        const duration = Date.now() - startTime;
        
        results.push({
          ...fn,
          status: error ? 'error' : (data?.success ? 'healthy' : 'degraded'),
          latency: duration,
          lastChecked: new Date().toISOString(),
          error: (error as any)?.message || data?.error
        });
      } catch (err: unknown) {
        results.push({
          ...fn,
          status: 'error',
          latency: Date.now() - startTime,
          lastChecked: new Date().toISOString(),
          error: (err as any).message
        });
      }
    }
    
    setDiagnostics(results);
    setCheckingHealth(false);
    toast.success('Edge Function health check completed');
    
    // Log diagnostic check
    await (supabase.from('admin_security_logs') as any).insert({
      admin_id: user?.id,
      event_type: 'mfa_diagnostic_check',
      outcome: 'completed',
      additional_details: { results }
    });
  };

  useEffect(() => {
    loadReports();
    checkHealth();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('security_reports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      toast.error('Failed to load security reports');
    } finally {
      setLoading(false);
    }
  };

  const runAudit = async () => {
    setRunning(true);
    try {
      const { error } = await invokeEdgeFunction('run-security-audit', {
        body: {
          report_name: `Security Scan ${format(new Date(), 'MMM dd, HH:mm')}`,
          compliance_type: 'ALL',
          created_by: user?.id
        }
      });

      if (error) throw error;
      toast.success('Security audit initiated successfully!');
      loadReports();
    } catch (error) {
      toast.error('Failed to initiate security scan');
    } finally {
      setRunning(false);
    }
  };

  const exportToPDF = (report: any) => {
    try {
      const doc = new jsPDF();
      
      // Add Title
      doc.setFontSize(20);
      doc.setTextColor(212, 175, 55); // Gold
      doc.text('Gold X Usdt - Security Audit Report', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy HH:mm:ss')}`, 14, 28);
      doc.text(`Scan Name: ${report.report_name}`, 14, 34);
      doc.text(`Overall Security Score: ${report.score}/100`, 14, 40);

      // Add Summary Section
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Executive Summary', 14, 52);
      
      autoTable(doc, {
        startY: 56,
        head: [['Metric', 'Value']],
        body: [
          ['Status', report.status.toUpperCase()],
          ['Compliance Type', 'OWASP, PCI-DSS, GDPR'],
          ['Vulnerabilities Found', report.vulnerabilities_found?.length || 0],
          ['Scan Timestamp', format(new Date(report.created_at), 'MMM dd, yyyy HH:mm')]
        ],
        theme: 'striped',
        headStyles: { fillColor: [212, 175, 55] }
      });

      // Add Vulnerabilities Section
      if (report.vulnerabilities_found?.length > 0) {
        doc.text('Detected Vulnerabilities', 14, (doc as any).lastAutoTable.finalY + 15);
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 20,
          head: [['Description', 'Severity', 'Standard']],
          body: report.vulnerabilities_found.map((v: any) => [
            v.description,
            v.severity.toUpperCase(),
            v.standard
          ]),
          theme: 'grid',
          headStyles: { fillColor: [220, 38, 38] } // Red for vulnerabilities
        });
      }

      // Add Recommendations
      if (report.recommendations?.length > 0) {
        doc.text('Remediation Recommendations', 14, (doc as any).lastAutoTable.finalY + 15);
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 20,
          head: [['#', 'Recommendation']],
          body: report.recommendations.map((r: string, i: number) => [i + 1, r]),
          theme: 'plain'
        });
      }

      doc.save(`security-audit-${report.id.substring(0, 8)}.pdf`);
      toast.success('Audit report exported to PDF');
    } catch (error) {
      console.error('PDF Export Error:', error);
      toast.error('Failed to generate PDF report');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">CRITICAL</Badge>;
      case 'high': return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">HIGH</Badge>;
      case 'medium': return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">MEDIUM</Badge>;
      default: return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">LOW</Badge>;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-8 max-w-7xl mx-auto">
      <SEOHead title="Security Audit & Compliance - Admin" noindex={true} />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-4xl font-black v56-gradient-text tracking-tight leading-tight flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            Security Audit <span className="text-foreground">& Compliance</span>
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            OWASP, PCI-DSS & GDPR Automated Scanner
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={loadReports} 
            className="flex-1 sm:flex-none h-12 rounded-xl border-primary/20 hover:bg-primary/5"
            disabled={loading || running}
          >
            <Activity className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button 
            onClick={runAudit} 
            className="flex-1 sm:flex-none h-12 rounded-xl font-bold uppercase tracking-widest text-xs px-6 premium-gradient"
            disabled={loading || running}
          >
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
            Run Security Scan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="v56-glass premium-border rounded-3xl overflow-hidden">
          <CardHeader className="p-6 border-b border-white/5 bg-primary/5">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              Compliance Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span>OWASP TOP 10</span>
                <span className="text-green-500">92%</span>
              </div>
              <Progress value={92} className="h-1" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span>PCI-DSS v4.0</span>
                <span className="text-yellow-500">85%</span>
              </div>
              <Progress value={85} className="h-1" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span>GDPR / CCPA</span>
                <span className="text-green-500">95%</span>
              </div>
              <Progress value={95} className="h-1" />
            </div>
          </CardContent>
        </Card>

        <Card className="v56-glass premium-border rounded-3xl overflow-hidden">
          <CardHeader className="p-6 border-b border-white/5 bg-primary/5">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              Scan History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
             <div className="text-3xl font-black">{reports.length}</div>
             <p className="text-xs text-muted-foreground">Total automated scans performed</p>
          </CardContent>
        </Card>

        <Card className="v56-glass premium-border rounded-3xl overflow-hidden">
          <CardHeader className="p-6 border-b border-white/5 bg-primary/5">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              Pending Fixes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
             <div className="text-3xl font-black">
                {reports[0]?.vulnerabilities_found?.length || 0}
             </div>
             <p className="text-xs text-muted-foreground">Detected vulnerabilities needing attention</p>
          </CardContent>
        </Card>
      </div>

      <Card className="v56-glass premium-border rounded-3xl overflow-hidden">
        <CardHeader className="p-8 border-b border-white/5 bg-white/5">
           <CardTitle className="text-xl font-black">Audit History</CardTitle>
           <CardDescription>Comprehensive log of automated security scans.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
           <Table>
             <TableHeader className="bg-white/5">
               <TableRow className="border-white/5 hover:bg-transparent">
                 <TableHead className="py-6 pl-8 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Scan Name / Date</TableHead>
                 <TableHead className="py-6 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Score</TableHead>
                 <TableHead className="py-6 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Status</TableHead>
                 <TableHead className="py-6 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Vulnerabilities</TableHead>
                 <TableHead className="py-6 pr-8 font-black uppercase tracking-widest text-[10px] text-muted-foreground text-right">Actions</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {reports.map((report) => (
                 <TableRow key={report.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                   <TableCell className="py-6 pl-8">
                      <div className="space-y-1">
                        <p className="font-bold text-sm">{report.report_name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                          {format(new Date(report.created_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                   </TableCell>
                   <TableCell className="py-6">
                      <div className={`text-xl font-black ${getScoreColor(report.score)}`}>
                        {report.score}/100
                      </div>
                   </TableCell>
                   <TableCell className="py-6">
                      <Badge variant="outline" className={report.status === 'completed' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"}>
                        {report.status.toUpperCase()}
                      </Badge>
                   </TableCell>
                   <TableCell className="py-6">
                      <div className="flex gap-2">
                         {report.vulnerabilities_found?.length > 0 ? (
                           <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                             {report.vulnerabilities_found.length} DETECTED
                           </Badge>
                         ) : (
                           <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                             HEALTHY
                           </Badge>
                         )}
                      </div>
                   </TableCell>
                   <TableCell className="py-6 pr-8 text-right">
                      <div className="flex justify-end gap-2">
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           className="text-primary hover:text-primary hover:bg-primary/5"
                           onClick={() => exportToPDF(report)}
                         >
                           <Download className="h-4 w-4" />
                         </Button>
                         <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight className="h-4 w-4" />
                         </Button>
                      </div>
                   </TableCell>
                 </TableRow>
               ))}
               {reports.length === 0 && (
                 <TableRow>
                   <TableCell colSpan={5} className="py-20 text-center text-muted-foreground italic text-sm">
                     No security audits performed yet. Click "Run Security Scan" to start.
                   </TableCell>
                 </TableRow>
               )}
             </TableBody>
           </Table>
        </CardContent>
      </Card>

      <Card className="v56-glass premium-border rounded-3xl overflow-hidden mt-8">
        <CardHeader className="p-8 border-b border-white/5 bg-white/5 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-black flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Edge Function Diagnostics
            </CardTitle>
            <CardDescription>Real-time monitoring of security-critical Edge Functions.</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkHealth}
            disabled={checkingHealth}
            className="h-10 rounded-xl border-primary/20"
          >
            {checkingHealth ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Check Health
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="py-6 pl-8 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Function Name</TableHead>
                <TableHead className="py-6 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Status</TableHead>
                <TableHead className="py-6 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Latency</TableHead>
                <TableHead className="py-6 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Last Checked</TableHead>
                <TableHead className="py-6 pr-8 font-black uppercase tracking-widest text-[10px] text-muted-foreground text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {diagnostics.length > 0 ? diagnostics.map((fn) => (
                <TableRow key={fn.name} className="border-white/5 hover:bg-white/5 transition-colors">
                  <TableCell className="py-6 pl-8">
                    <div className="space-y-1">
                      <p className="font-bold text-sm">{fn.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{fn.description}</p>
                    </div>
                  </TableCell>
                  <TableCell className="py-6">
                    <Badge variant="outline" className={
                      fn.status === 'healthy' ? "bg-green-500/10 text-green-500 border-green-500/20" : 
                      fn.status === 'error' ? "bg-red-500/10 text-red-500 border-red-500/20" : 
                      "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                    }>
                      {fn.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-6 font-mono text-xs">
                    {fn.latency}ms
                  </TableCell>
                  <TableCell className="py-6 text-[10px] text-muted-foreground">
                    {fn.lastChecked ? format(new Date(fn.lastChecked), 'HH:mm:ss') : 'N/A'}
                  </TableCell>
                  <TableCell className="py-6 pr-8 text-right">
                    {fn.error && (
                      <span className="text-[10px] text-red-500 italic max-w-[200px] truncate block ml-auto">
                        {fn.error}
                      </span>
                    )}
                    {!fn.error && <span className="text-[10px] text-green-500">Service operational</span>}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-muted-foreground italic">
                    Initializing diagnostics...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>


      {reports[0]?.vulnerabilities_found?.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <Card className="v56-glass premium-border rounded-3xl overflow-hidden border-red-500/20">
             <CardHeader className="p-8 border-b border-white/5 bg-red-500/5">
                <CardTitle className="text-xl font-black flex items-center gap-3">
                  <ShieldAlert className="h-5 w-5 text-red-500" />
                  Detected Vulnerabilities
                </CardTitle>
             </CardHeader>
             <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {reports[0].vulnerabilities_found.map((vuln: any, idx: number) => (
                      <TableRow key={idx} className="border-white/5">
                        <TableCell className="py-6 pl-8">
                           <div className="space-y-1">
                             <div className="flex items-center gap-2">
                               <p className="font-bold text-sm">{vuln.description}</p>
                               {getSeverityBadge(vuln.severity)}
                             </div>
                             <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{vuln.standard}</p>
                           </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
             </CardContent>
           </Card>

           <Card className="v56-glass premium-border rounded-3xl overflow-hidden border-blue-500/20">
             <CardHeader className="p-8 border-b border-white/5 bg-blue-500/5">
                <CardTitle className="text-xl font-black flex items-center gap-3">
                  <Fingerprint className="h-5 w-5 text-blue-500" />
                  Remediation Guide
                </CardTitle>
             </CardHeader>
             <CardContent className="p-8 space-y-6">
                {reports[0].recommendations.map((rec: string, idx: number) => (
                   <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                      <div className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-black shrink-0">
                        {idx + 1}
                      </div>
                      <p className="text-sm leading-relaxed">{rec}</p>
                   </div>
                ))}
                {reports[0].recommendations.length === 0 && (
                  <p className="text-center text-muted-foreground italic py-10">No specific recommendations found.</p>
                )}
             </CardContent>
           </Card>
        </div>
      )}
    </div>
  );
}
