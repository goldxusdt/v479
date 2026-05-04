import { FileText, Search, Loader2, CheckCircle2, XCircle, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SEOHead } from '@/utils/seo';

interface UploadLog {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  status: string;
  error_message: string;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

const TroubleshootingSteps = [
  {
    title: "Server Configuration Checks",
    steps: [
      "Verify 'upload_max_filesize' in php.ini (recommended: 10M)",
      "Verify 'post_max_size' in php.ini (recommended: 12M)",
      "Ensure directory write permissions for storage buckets",
      "Check available disk space in Supabase Storage or S3"
    ]
  },
  {
    title: "Client-Side Checks",
    steps: [
      "Ensure file types are within whitelist (PNG, JPG, PDF)",
      "Verify file size doesn't exceed 10MB",
      "Check browser compatibility for File API",
      "Clear browser cache and retry"
    ]
  },
  {
    title: "Network & Application Checks",
    steps: [
      "Inspect server logs for specific HTTP error codes (e.g., 413 Payload Too Large, 403 Forbidden)",
      "Check for CORS policy blocking upload requests",
      "Verify timeout settings for long-running upload requests",
      "Confirm API endpoint availability and authentication status"
    ]
  }
];

export default function AdminUploadLogsPage() {
  const [logs, setLogs] = useState<UploadLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('upload_logs')
        .select('*, profiles(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Failed to fetch upload logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-10 space-y-10 max-w-7xl mx-auto">
      <SEOHead title="Document Upload Troubleshooting" noindex={true} />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-4xl font-black v56-gradient-text tracking-tight">
            Upload <span className="text-foreground">Troubleshooting</span>
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Diagnose and resolve document upload failures across the platform.
          </p>
        </div>
        <Button onClick={fetchLogs} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Refresh Logs'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Troubleshooting Guide */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2 px-2">
            <Info className="h-5 w-5 text-primary" />
            Resolution Guide
          </h2>
          {TroubleshootingSteps.map((section, idx) => (
            <Card key={idx} className="v56-glass premium-border bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary">{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {section.steps.map((step, sIdx) => (
                    <li key={sIdx} className="text-xs flex gap-2 text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Upload Logs Table */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="v56-glass premium-border overflow-hidden">
            <CardHeader className="border-b border-white/5 bg-primary/5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Recent Upload Activity</CardTitle>
                  <CardDescription>Real-time log of all document upload attempts.</CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search logs..." 
                    className="pl-9 bg-background/50"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-bold">Status</TableHead>
                      <TableHead className="font-bold">User</TableHead>
                      <TableHead className="font-bold">File</TableHead>
                      <TableHead className="font-bold">Size</TableHead>
                      <TableHead className="font-bold">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                          {searchTerm ? 'No matching logs found.' : 'No upload activity recorded yet.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map(log => (
                        <TableRow key={log.id} className="hover:bg-white/[0.02]">
                          <TableCell>
                            {log.status === 'success' ? (
                              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 font-bold">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Success
                              </Badge>
                            ) : (
                              <div className="space-y-1">
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 font-bold">
                                  <XCircle className="h-3 w-3 mr-1" /> Failed
                                </Badge>
                                <p className="text-[10px] text-red-400 max-w-[200px] truncate" title={log.error_message}>{log.error_message}</p>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span className="text-xs">{log.profiles?.full_name || 'N/A'}</span>
                              <span className="text-[10px] text-muted-foreground">{log.profiles?.email || 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-xs truncate max-w-[150px]" title={log.file_name}>{log.file_name}</span>
                              <span className="text-[10px] text-muted-foreground">{log.file_type}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {(log.file_size / 1024 / 1024).toFixed(2)} MB
                          </TableCell>
                          <TableCell className="text-[10px] text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
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
      </div>
    </div>
  );
}
