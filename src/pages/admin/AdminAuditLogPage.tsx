import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { getAdminAuditLogs } from '@/services/api';
import { History, Search, FileJson, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ComplianceExportDialog } from '@/components/admin/ComplianceExportDialog';

export default function AdminAuditLogPage() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const data = await getAdminAuditLogs();
      setLogs(data);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    (log.action?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (log.admin?.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (log.admin?.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Only Administrators can view the system audit logs. Please contact the platform owner if you believe this is an error.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const renderDiff = (oldVal: any, newVal: any) => {
    const oldObj = oldVal || {};
    const newObj = newVal || {};
    const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted p-2 rounded">Previous State</h4>
          <div className="text-xs space-y-1 font-mono p-4 rounded-lg bg-black/20 border border-white/5 overflow-auto max-h-[500px]">
            {allKeys.map(key => {
              const isChanged = JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key]);
              if (!(key in oldObj)) return null;
              return (
                <div key={key} className={isChanged ? "bg-red-500/10 p-1 rounded" : "p-1"}>
                  <span className="text-muted-foreground">{key}:</span> {JSON.stringify(oldObj[key])}
                </div>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 p-2 rounded">New State</h4>
          <div className="text-xs space-y-1 font-mono p-4 rounded-lg bg-primary/5 border border-primary/10 overflow-auto max-h-[500px]">
            {allKeys.map(key => {
              const isChanged = JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key]);
              const isNew = !(key in oldObj);
              if (!(key in newObj)) return null;
              return (
                <div key={key} className={isChanged || isNew ? "bg-green-500/10 p-1 rounded" : "p-1"}>
                  <span className={isNew ? "text-green-500" : "text-muted-foreground"}>{key}:</span> {JSON.stringify(newObj[key])}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold v56-gradient-text">Admin Audit Logs</h1>
          <p className="text-muted-foreground">Historical tracking of all administrative changes</p>
        </div>
        <ComplianceExportDialog onExportSuccess={loadLogs} />
      </div>

      <Card className="v56-glass premium-border">
        <CardHeader>
          <div className="flex items-center gap-2 mb-4">
            <History className="h-5 w-5 text-primary" />
            <CardTitle>System Activity</CardTitle>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by action or admin..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 v56-glass-input"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">Loading logs...</TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">No audit logs found</TableCell>
                </TableRow>
              ) : filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {log.created_at ? format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss') : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{log.admin?.full_name || 'System'}</span>
                      <span className="text-xs text-muted-foreground">{log.admin?.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary">
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                      {log.target_table}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                          <FileJson className="h-4 w-4 mr-2" />
                          View Change
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto duration-0 animate-none fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase">Audit Log Change Analysis</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6 pt-6">
                           <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-accent/30 border border-white/5">
                              <div className="space-y-1">
                                 <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Admin Action</p>
                                 <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary font-bold">{log.action}</Badge>
                              </div>
                              <div className="space-y-1">
                                 <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Affected Table</p>
                                 <p className="text-xs font-mono font-bold text-white/80">{log.target_table}</p>
                              </div>
                              <div className="space-y-1">
                                 <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Operator</p>
                                 <p className="text-xs font-bold">{log.admin?.full_name || 'System Auto'}</p>
                              </div>
                           </div>
                           
                           {renderDiff(log.old_value, log.new_value)}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
