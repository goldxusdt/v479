import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { FileDown, ShieldAlert, Loader2 } from 'lucide-react';
import { supabase } from '@/services/supabase';

interface ComplianceExportDialogProps {
  onExportSuccess?: () => void;
}

export function ComplianceExportDialog({ onExportSuccess }: ComplianceExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState<'pdf' | 'csv' | 'excel'>('pdf');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [acknowledged, setAcknowledged] = useState(false);

  const handleExport = async () => {
    if (!acknowledged) {
      toast.error('Please acknowledge the security warning');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-compliance-report', {
        body: {
          format,
          date_range: {
            start: dateRange.start ? new Date(dateRange.start).toISOString() : null,
            end: dateRange.end ? new Date(dateRange.end).toISOString() : null,
          },
        },
      });

      if (error) throw error;

      // Handle file download
      const blob = new Blob([data], { type: format === 'pdf' ? 'application/pdf' : 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance_audit_report_${Date.now()}.${format === 'pdf' ? 'pdf' : 'zip'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Report exported successfully');
      setOpen(false);
      if (onExportSuccess) onExportSuccess();
    } catch (error: unknown) {
      console.error('Export failed:', error);
      toast.error((error as any).message || 'Failed to export report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="v56-glass premium-border">
          <FileDown className="h-4 w-4 mr-2" />
          Export Compliance Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Secure Audit Export</DialogTitle>
          <DialogDescription>
            Generate a tamper-evident compliance report for system audits.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="format">Export Format</Label>
            <Select value={format} onValueChange={(v: any) => setFormat(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF (Signed & Watermarked)</SelectItem>
                <SelectItem value="csv">CSV (Hashed with Manifest)</SelectItem>
                <SelectItem value="excel">Excel (Hashed with Manifest)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="start">Start Date</Label>
              <Input
                id="start"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end">End Date</Label>
              <Input
                id="end"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          </div>
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex gap-3">
            <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
            <div className="space-y-2">
              <p className="text-xs font-bold text-destructive uppercase">Security Warning</p>
              <p className="text-[11px] leading-tight text-destructive/80">
                This is a tamper-evident compliance report. Any modification will be detectable via cryptographic hashing and digital signatures. Export attribution is anonymized for privacy.
              </p>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="acknowledge"
                  checked={acknowledged}
                  onCheckedChange={(v) => setAcknowledged(!!v)}
                />
                <Label htmlFor="acknowledge" className="text-[10px] font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  I acknowledge this is a sensitive report
                </Label>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={loading || !acknowledged} className="v56-primary-btn">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Export Report'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
