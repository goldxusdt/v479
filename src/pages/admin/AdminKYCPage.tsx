import { CheckCircle, ExternalLink, XCircle, Shield, RefreshCw, FileText, Table as TableIcon, Upload } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/services/supabase';
import type { Profile } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/utils/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function AdminKYCPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [manualUploadOpen, setManualUploadOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isLiveRefresh, setIsLiveRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Manual Upload State
  const [manualUserId, setManualUserId] = useState('');
  const [manualDocType, setManualDocType] = useState('National ID');
  const [manualFiles, setManualFiles] = useState<{front?: File, back?: File, selfie?: File}>({});
  const [uploading, setUploading] = useState(false);

  const loadUsers = useCallback(async (_showLoading = true) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('kyc_status', 'not_submitted')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
      setLastRefresh(new Date());

      // Load all users for manual upload
      const { data: allData } = await supabase
        .from('profiles')
        .select('id, full_name, email, username')
        .order('username', { ascending: true });
      setAllUsers(allData || []);
    } catch (error) {
      console.error('Failed to load KYC submissions:', error);
    }
  }, []);

  useEffect(() => {
    loadUsers();

    // Real-time subscription for KYC submissions
    const channel = supabase
      .channel('admin_kyc_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: 'kyc_status=neq.not_submitted' },
        () => {
          loadUsers(false);
        }
      )
      .subscribe();

    let interval: NodeJS.Timeout;
    if (isLiveRefresh) {
      interval = setInterval(() => {
        loadUsers(false);
      }, 30000);
    }

    return () => {
      supabase.removeChannel(channel);
      if (interval) clearInterval(interval);
    };
  }, [loadUsers, isLiveRefresh]);

  const handleApprove = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        // @ts-ignore - Supabase type inference issue
        .update({ kyc_status: 'approved', kyc_rejection_reason: null })
        .eq('id', userId);

      if (error) throw error;
      toast.success('KYC approved successfully');
      loadUsers();
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to approve KYC:', error);
      toast.error('Failed to approve KYC');
    }
  };

  const handleReject = async (userId: string) => {
    if (!rejectionReason) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        // @ts-ignore - Supabase type inference issue
        .update({ kyc_status: 'rejected', kyc_rejection_reason: rejectionReason })
        .eq('id', userId);

      if (error) throw error;
      toast.success('KYC rejected');
      setRejectionReason('');
      loadUsers();
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to reject KYC:', error);
      toast.error('Failed to reject KYC');
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("KYC Documents Report", 20, 10);
    
    const tableData = users.map(user => [
      user.id,
      user.full_name || user.username || 'N/A',
      user.email,
      (user as any).kyc_document_type || 'N/A',
      user.kyc_status,
      user.kyc_id_number || 'N/A',
      format(new Date(user.created_at), 'yyyy-MM-dd HH:mm')
    ]);

    autoTable(doc, {
      head: [['ID', 'Name', 'Email', 'Type', 'Status', 'ID Number', 'Date']],
      body: tableData,
      startY: 20
    });

    doc.save(`KYC_Report_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
    toast.success('PDF report exported');
  };

  const handleManualUpload = async () => {
    if (!manualUserId) {
      toast.error('Please select a user');
      return;
    }

    setUploading(true);
    try {
      const uploadFile = async (file: File, prefix: string) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${manualUserId}/${prefix}_${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('kyc-documents')
          .upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('kyc-documents').getPublicUrl(fileName);
        return urlData.publicUrl;
      };

      const urls: any = {};
      if (manualFiles.front) urls.kyc_id_front = await uploadFile(manualFiles.front, 'front');
      if (manualFiles.back) urls.kyc_id_back = await uploadFile(manualFiles.back, 'back');
      if (manualFiles.selfie) urls.kyc_selfie = await uploadFile(manualFiles.selfie, 'selfie');

      const { error } = await supabase
        .from('profiles')
        // @ts-ignore
        .update({
          ...urls,
          kyc_status: 'approved',
          kyc_document_type: manualDocType,
          kyc_rejection_reason: null
        })
        .eq('id', manualUserId);

      if (error) throw error;

      // Add record to kyc_documents table as well for better tracking
      if (urls.kyc_id_front) {
        await (supabase.from('kyc_documents') as any).insert({
          user_id: manualUserId,
          document_type: manualDocType,
          file_url: urls.kyc_id_front,
          status: 'approved',
          uploaded_by_admin: true
        });
      }

      toast.success('KYC documents uploaded and approved manually');
      setManualUploadOpen(false);
      setManualFiles({});
      setManualUserId('');
      loadUsers();
    } catch (error: unknown) {
      console.error('Manual KYC upload failed:', error);
      toast.error('Manual KYC upload failed: ' + (error as any).message);
    } finally {
      setUploading(false);
    }
  };

  const handleExportExcel = () => {
    const tableData = users.map(user => ({
      'User ID': user.id,
      'Name': user.full_name || user.username || 'N/A',
      'Email': user.email,
      'Document Type': (user as any).kyc_document_type || 'N/A',
      'Status': user.kyc_status,
      'ID Number': user.kyc_id_number || 'N/A',
      'Submission Date': format(new Date(user.created_at), 'yyyy-MM-dd HH:mm'),
      'Front Image': user.kyc_id_front || 'N/A',
      'Back Image': user.kyc_id_back || 'N/A',
      'Selfie': user.kyc_selfie || 'N/A',
      'OCR Text': user.kyc_ocr_text || 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(tableData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "KYC Data");
    XLSX.writeFile(workbook, `KYC_Report_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    toast.success('Excel report exported');
  };


  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold v56-gradient-text">KYC Documents</h1>
          <p className="text-muted-foreground">Review and verify user identity documents</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportPDF} 
            className="v56-glass border-white/10 uppercase font-black text-[10px] tracking-widest h-10 px-4"
          >
            <FileText className="mr-2 h-3 w-3" />
            PDF Export
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportExcel} 
            className="v56-glass border-white/10 uppercase font-black text-[10px] tracking-widest h-10 px-4"
          >
            <TableIcon className="mr-2 h-3 w-3" />
            Excel Export
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadUsers()} 
            className="v56-glass border-white/10 uppercase font-black text-[10px] tracking-widest h-10 px-4 ml-2"
          >
            <RefreshCw className="mr-2 h-3 w-3" />
            Refresh
          </Button>

          <Dialog open={manualUploadOpen} onOpenChange={setManualUploadOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="default" 
                size="sm" 
                className="premium-gradient uppercase font-black text-[10px] tracking-widest h-10 px-4"
              >
                <Upload className="mr-2 h-3 w-3" />
                Manual Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Manual KYC Upload</DialogTitle>
                <DialogDescription>
                  Upload documents on behalf of a user and approve them immediately.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select User</Label>
                  <Select value={manualUserId} onValueChange={setManualUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Search user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allUsers.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.username || u.full_name} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <Select value={manualDocType} onValueChange={setManualDocType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="National ID">National ID</SelectItem>
                      <SelectItem value="Passport">Passport</SelectItem>
                      <SelectItem value="Driver License">Driver License</SelectItem>
                      <SelectItem value="Utility Bill">Utility Bill</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">ID Front</Label>
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => setManualFiles(prev => ({...prev, front: e.target.files?.[0]}))} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">ID Back</Label>
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => setManualFiles(prev => ({...prev, back: e.target.files?.[0]}))} 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Selfie (Optional)</Label>
                  <Input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => setManualFiles(prev => ({...prev, selfie: e.target.files?.[0]}))} 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setManualUploadOpen(false)}>Cancel</Button>
                <Button onClick={handleManualUpload} disabled={uploading} className="premium-gradient">
                  {uploading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  Upload & Approve
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button 
            variant={isLiveRefresh ? "default" : "outline"} 
            size="sm" 
            onClick={() => setIsLiveRefresh(!isLiveRefresh)} 
            className="v56-glass border-white/10 uppercase font-black text-[10px] tracking-widest h-10 px-4"
          >
            <RefreshCw className={cn("mr-2 h-3 w-3", isLiveRefresh && "animate-pulse text-green-500")} />
            {isLiveRefresh ? 'Live ON' : 'Live OFF'}
          </Button>
        </div>
      </div>

      <div className="text-[10px] uppercase font-bold text-muted-foreground opacity-60">
        Last update: {format(lastRefresh, 'HH:mm:ss')}
      </div>

      <Card className="v56-glass premium-border">
        <CardHeader>
          <CardTitle>KYC Submissions</CardTitle>
          <CardDescription>Review user identity documents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="p-4 border border-primary/10 rounded-lg bg-accent/30"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-primary">{user.full_name || user.username || 'No name'}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="mt-2 flex items-center gap-4 flex-wrap">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                        Submitted: {new Date(user.created_at).toLocaleDateString()}
                      </p>
                      {(user as any).kyc_document_type && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                          <FileText className="h-3 w-3 text-blue-500" />
                          <span className="text-[10px] font-bold text-blue-500 uppercase">{(user as any).kyc_document_type}</span>
                        </div>
                      )}
                      {user.kyc_id_number && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                          <Shield className="h-3 w-3 text-primary" />
                          <span className="text-[10px] font-mono font-bold text-primary tracking-tighter">AI-ID: {user.kyc_id_number}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border ${
                    user.kyc_status === 'approved' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                    user.kyc_status === 'rejected' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                    'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                  }`}>
                    {user.kyc_status}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <Dialog open={dialogOpen && selectedUser?.id === user.id} onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (open) setSelectedUser(user);
                  }}>
                    <DialogTrigger asChild>
                      {user.kyc_status === 'pending' ? (
                        <Button size="sm" className="w-full rounded-xl font-bold uppercase tracking-widest text-[10px]">
                          <CheckCircle className="h-3 w-3 mr-2" />
                          Review & Action
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" className="w-full rounded-xl font-bold uppercase tracking-widest text-[10px] border-primary/20 hover:bg-primary/5">
                          <Shield className="h-3 w-3 mr-2 text-primary" />
                          View Details
                        </Button>
                      )}
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto duration-0 animate-none fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]">
                      <DialogHeader>
                        <DialogTitle>KYC Verification: {user.full_name || user.username}</DialogTitle>
                        <DialogDescription>Review AI-extracted data alongside document proof</DialogDescription>
                      </DialogHeader>
                      {selectedUser && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <h4 className="text-sm font-black uppercase tracking-widest text-primary">Document Proof</h4>
                              <div className="space-y-4">
                                {selectedUser.kyc_id_front && (
                                  <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-tighter">ID Front View</Label>
                                    <div className="relative group overflow-hidden rounded-xl border border-primary/20 aspect-video bg-accent/30 flex items-center justify-center">
                                      <img loading="lazy" decoding="async" src={selectedUser.kyc_id_front} alt="ID Front" className="w-full h-full object-contain" />
                                      <a href={selectedUser.kyc_id_front} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                        <ExternalLink className="h-6 w-6 text-white" />
                                      </a>
                                    </div>
                                  </div>
                                )}
                                {selectedUser.kyc_id_back && (
                                  <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-tighter">ID Back View</Label>
                                    <div className="relative group overflow-hidden rounded-xl border border-primary/20 aspect-video bg-accent/30 flex items-center justify-center">
                                      <img loading="lazy" decoding="async" src={selectedUser.kyc_id_back} alt="ID Back" className="w-full h-full object-contain" />
                                      <a href={selectedUser.kyc_id_back} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                        <ExternalLink className="h-6 w-6 text-white" />
                                      </a>
                                    </div>
                                  </div>
                                )}
                                {selectedUser.kyc_selfie && (
                                  <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-tighter">Selfie Verification</Label>
                                    <div className="relative group overflow-hidden rounded-xl border border-primary/20 aspect-video bg-accent/30 flex items-center justify-center">
                                      <img loading="lazy" decoding="async" src={selectedUser.kyc_selfie} alt="Selfie" className="w-full h-full object-contain" />
                                      <a href={selectedUser.kyc_selfie} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                        <ExternalLink className="h-6 w-6 text-white" />
                                      </a>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="space-y-6">
                              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-4">
                                <h4 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4" />
                                  AI Analysis Report
                                </h4>
                                <div className="space-y-3">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                      <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">Document Type</Label>
                                      <p className="text-sm font-bold text-blue-500 uppercase">
                                        {(selectedUser as any).kyc_document_type || 'N/A'}
                                      </p>
                                    </div>
                                    <div>
                                      <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">Detected ID Number</Label>
                                      <p className="text-sm font-mono font-bold text-primary tracking-wider">
                                        {selectedUser.kyc_id_number || 'No ID Number Detected'}
                                      </p>
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">Full OCR Raw Output</Label>
                                    <div className="mt-2 p-3 rounded-xl bg-background/50 border border-white/5 text-[10px] font-mono whitespace-pre-wrap max-h-[150px] overflow-y-auto leading-relaxed">
                                      {selectedUser.kyc_ocr_text || 'No OCR text available for this submission.'}
                                    </div>
                                  </div>
                                  <div className="pt-2 border-t border-primary/10">
                                    <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">User Profile Name</Label>
                                    <p className="font-bold text-sm">{selectedUser.full_name}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4 pt-4 border-t border-white/5">
                                {selectedUser.kyc_status === 'pending' ? (
                                  <>
                                    <div className="space-y-2">
                                      <Label className="text-[10px] uppercase font-black tracking-widest">Decision Reason</Label>
                                      <Textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Enter reason if rejecting or internal notes if approving..."
                                        rows={3}
                                        className="bg-accent/30 border-white/10"
                                      />
                                    </div>
                                    <div className="flex gap-4">
                                      <Button className="flex-1 h-12 rounded-xl font-bold uppercase tracking-widest" onClick={() => handleApprove(selectedUser.id)}>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Verify
                                      </Button>
                                      <Button variant="destructive" className="flex-1 h-12 rounded-xl font-bold uppercase tracking-widest" onClick={() => handleReject(selectedUser.id)}>
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Reject
                                      </Button>
                                    </div>
                                  </>
                                ) : (
                                  <div className={`p-4 rounded-xl border font-bold text-center uppercase tracking-widest text-xs ${
                                    selectedUser.kyc_status === 'approved' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'
                                  }`}>
                                    Status: {selectedUser.kyc_status}
                                    {selectedUser.kyc_rejection_reason && (
                                      <p className="mt-2 text-[10px] font-normal lowercase tracking-normal text-muted-foreground italic">
                                        Reason: {selectedUser.kyc_rejection_reason}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
