import { CheckCircle, Shield, Upload, User, Download, MapPin, Phone, Fingerprint, FileText, Wallet, Lock, History, Activity, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { invokeEdgeFunction } from '@/services/functions';
import { getProfile, updateProfile, getMyActivityLogs } from '@/services/api';
import { supabase } from '@/services/supabase';
import { exportToCSV } from '@/utils/csv-export';
import { countries } from '@/utils/countries';
import { getStatesForCountry } from '@/utils/states';
import type { Profile, ActivityLog, Transaction } from '@/types';
import { cn } from '@/utils/utils';
import { format } from 'date-fns';

export default function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [, setUploading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [documentType, setDocumentType] = useState<string>('');
  const [autoWithdrawal, setAutoWithdrawal] = useState(false);
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    address: '',
    state: '',
    city: '',
    country: '',
    postal_code: '',
    withdrawal_wallet_address: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
    otp: ''
  });
  const [passwordStep, setPasswordStep] = useState<'initial' | 'otp' | 'new_password'>('initial');
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  useEffect(() => {
    loadProfile();
    loadActivity();
  }, [user]);

  const handleSendPasswordOTP = async () => {
    if (!user?.email) return;
    setIsPasswordLoading(true);
    try {
      const { error } = await invokeEdgeFunction('send-otp', {
        body: { email: user.email, purpose: 'password_change' }
      });
      if (error) throw error;
      toast.success('OTP sent to your email');
      setPasswordStep('otp');
      setIsPasswordDialogOpen(true);
    } catch (error: unknown) {
      toast.error((error as any).message || 'Failed to send OTP');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleVerifyPasswordOTP = async () => {
    if (!user?.email || !passwordForm.otp) return;
    setIsPasswordLoading(true);
    try {
      const { data, error } = await invokeEdgeFunction('verify-otp', {
        body: { 
          email: user.email, 
          otp: passwordForm.otp, 
          purpose: 'password_change' 
        }
      });
      if (error || !data?.success) throw new Error((error as any)?.message || 'Invalid OTP');
      toast.success('OTP verified');
      setPasswordStep('new_password');
    } catch (error: unknown) {
      toast.error((error as any).message || 'Failed to verify OTP');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    if (passwordForm.newPassword.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }

    setIsPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });
      if (error) throw error;
      toast.success('Password updated successfully');
      setIsPasswordDialogOpen(false);
      setPasswordStep('initial');
      setPasswordForm({ newPassword: '', confirmPassword: '', otp: '' });
    } catch (error: unknown) {
      toast.error((error as any).message || 'Failed to update password');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const loadProfile = async () => {
    if (!user) return;
    const data = await getProfile(user.id);
    if (data) {
      setProfile(data);
      setDocumentType((data as any).kyc_document_type || '');
      setAutoWithdrawal((data as any).auto_withdrawal_enabled || false);
      
      const country = (data as any).country || '';
      const state = (data as any).state || '';
      
      if (country) setAvailableStates(getStatesForCountry(country));
      
      setFormData({
        full_name: data.full_name || '',
        phone: data.phone || '',
        address: data.address || '',
        state: state,
        city: (data as any).city || '',
        country: country,
        postal_code: (data as any).postal_code || '',
        withdrawal_wallet_address: (data as any).withdrawal_wallet_address || ''
      });
    }
  };

  const loadActivity = async () => {
    if (!user) return;
    try {
      const logs = await getMyActivityLogs(user.id);
      setActivityLogs(logs || []);
    } catch (error) {
      console.error('Failed to load activity logs:', error);
    }
  };

  const handleDownloadMyData = async () => {
    if (!user || !profile) return;
    try {
      const [transactions, referrals] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('profiles').select('email, username, created_at, total_deposits').eq('referred_by', profile.referral_code)
      ]);
      exportToCSV([
        { category: 'Profile', detail: `Name: ${profile.full_name}, Email: ${profile.email}` },
        ...(transactions.data || []).map((tx: Transaction) => ({ category: 'Transaction', detail: `${tx.transaction_type}: ${tx.amount} USDT - ${tx.status}` })),
        ...(referrals.data || []).map((ref: Profile) => ({ category: 'Referral', detail: `${ref.email} (${ref.username || 'N/A'})` }))
      ], 'my_data_export');
      toast.success('Your data has been downloaded successfully');
    } catch (error) {
      toast.error('Failed to download your data');
    }
  };

  const handleAutoWithdrawalToggle = async (enabled: boolean) => {
    if (!user) return;
    try {
      const nextDate = enabled ? calculateNextWithdrawalDate() : null;
      const { error } = await (supabase.from('profiles') as any).update({
        auto_withdrawal_enabled: enabled,
        next_auto_withdrawal_date: nextDate
      }).eq('id', user.id);
      if (error) throw error;
      setAutoWithdrawal(enabled);
      toast.success(enabled ? 'Auto-withdrawal enabled' : 'Auto-withdrawal disabled');
      loadProfile();
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const calculateNextWithdrawalDate = () => {
    const now = new Date();
    const day = now.getDate();
    return new Date(now.getFullYear(), now.getMonth() + (day < 20 ? 0 : 1), 20).toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await updateProfile(user.id, formData);
      if (error) throw error;
      toast.success('Profile updated successfully');
      await refreshProfile();
      loadProfile();
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const isKycLocked = profile?.kyc_status === 'pending' || profile?.kyc_status === 'approved';

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: 'id_front' | 'id_back' | 'selfie') => {
    if (isKycLocked) {
      toast.error('KYC documents are locked during review or after approval');
      return;
    }
    if (!user || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.size > 1024 * 1024) return toast.error('File size must be < 1MB');
    if (!file.type.startsWith('image/')) return toast.error('Images only');

    setUploading(true);
    try {
      const filePath = `kyc/${user.id}/${docType}_${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('kyc_documents').upload(filePath, file, { upsert: true });
      
      if (uploadError) {
        await (supabase.from('upload_logs') as any).insert([{
          user_id: user.id,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          status: 'failure',
          error_message: (uploadError as any).message,
          metadata: { bucket: 'kyc_documents', filePath }
        }]);
        throw uploadError;
      }

      await (supabase.from('upload_logs') as any).insert([{
        user_id: user.id,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        status: 'success',
        metadata: { bucket: 'kyc_documents', filePath }
      }]);

      const { data: urlData } = supabase.storage.from('kyc_documents').getPublicUrl(filePath);
      const updateData: any = {};
      if (docType === 'id_front') updateData.kyc_id_front = urlData.publicUrl;
      if (docType === 'id_back') updateData.kyc_id_back = urlData.publicUrl;
      if (docType === 'selfie') updateData.kyc_selfie = urlData.publicUrl;
      
      updateData.kyc_status = 'pending';

      // Perform OCR if it's the front of the ID
      if (docType === 'id_front') {
        toast.info('Verifying document details...');
        try {
          // Generate a signed URL for OCR service (external access)
          const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from('kyc_documents')
            .createSignedUrl(filePath, 300); // 5 minutes expiry

          if (signedUrlError) throw signedUrlError;

          const { data: ocrData, error: ocrError } = await invokeEdgeFunction('kyc-ocr', {
            body: { url: signedUrlData.signedUrl }
          });
          
          if (ocrError) throw ocrError;
          if (ocrData?.text) {
            updateData.kyc_ocr_text = ocrData.text;
            // Simple heuristic to extract potential ID number (e.g., 8+ digits)
            const idMatch = ocrData.text.match(/\b\d{8,16}\b/);
            if (idMatch) {
              updateData.kyc_id_number = idMatch[0];
              toast.success(`Detected ID Number: ${idMatch[0]}`);
            }
          }
        } catch (ocrErr) {
          console.error('OCR failed:', ocrErr);
          // Don't block the upload if OCR fails
        }
      }

      const { error: updateError } = await updateProfile(user.id, updateData);
      if (updateError) throw updateError;
      toast.success('Document uploaded. Status set to pending.');
      loadProfile();
    } catch (error: unknown) {
      console.error('Upload failed:', error);
      toast.error(`Upload failed: ${(error as any).message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }

  };

  const kycDocs = [
    { id: 'id_front', label: documentType === 'passport' ? 'Passport Photo Page' : 'Identity Card Front', description: 'Clear photo of document front side' },
    ...(documentType !== 'passport' ? [{ id: 'id_back', label: 'Identity Card Back', description: 'Clear photo of document back side' }] : []),
    { id: 'selfie', label: 'Selfie with ID', description: 'Hold your ID next to your face' },
  ];

  const handleDocumentTypeChange = async (type: string) => {
    if (isKycLocked) return;
    setDocumentType(type);
    if (!user) return;
    try {
      const { error } = await (supabase.from('profiles') as any).update({ kyc_document_type: type }).eq('id', user.id);
      if (error) throw error;
      toast.success('Document type updated');
      loadProfile();
    } catch (error) {
      toast.error('Failed to update document type');
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight leading-tight">
              Account <span className="v56-gradient-text">Intelligence</span>
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              Manage your global identity and security settings
            </p>
          </div>
        </div>
        <Button onClick={handleDownloadMyData} variant="outline" className="rounded-xl border-primary/20 hover:bg-primary/5">
          <Download className="mr-2 h-4 w-4 text-primary" />
          Export My Data
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Tabs defaultValue="profile" className="space-y-8">
            <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-muted/50 p-1">
              <TabsTrigger value="profile" className="rounded-xl font-bold uppercase tracking-widest text-[10px]">
                <User className="h-3 w-3 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="security" className="rounded-xl font-bold uppercase tracking-widest text-[10px]">
                <Lock className="h-3 w-3 mr-2" />
                Security
              </TabsTrigger>
              <TabsTrigger value="activity" className="rounded-xl font-bold uppercase tracking-widest text-[10px]">
                <History className="h-3 w-3 mr-2" />
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-8 outline-none">
              {/* KYC Status Banner */}
              <div className={cn(
                "p-6 rounded-3xl border flex flex-col md:flex-row items-center gap-6 v56-glass",
                profile?.kyc_status === 'approved' ? "border-green-500/20 bg-green-500/5" : "border-primary/20 bg-primary/5"
              )}>
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center border transition-all",
                  profile?.kyc_status === 'approved' ? "bg-green-500/20 border-green-500/30 text-green-500 " : "bg-primary/10 border-primary/20 text-primary"
                )}>
                   {profile?.kyc_status === 'approved' ? <Shield className="h-8 w-8" /> : <Fingerprint className="h-8 w-8" />}
                </div>
                <div className="flex-1 text-center md:text-left space-y-1">
                  <h3 className="text-xl font-black uppercase tracking-tight">Identity Verification</h3>
                  <p className={cn("font-bold text-sm", 
                    profile?.kyc_status === 'approved' ? "text-green-500" : 
                    profile?.kyc_status === 'pending' ? "text-yellow-500" : 
                    "text-primary"
                  )}>
                    {profile?.kyc_status === 'approved' && "Elite Status Verified - All Features Unlocked"}
                    {profile?.kyc_status === 'pending' && "Documents Under Review - Please wait 24-48h"}
                    {profile?.kyc_status === 'rejected' && `Verification Rejected: ${profile.kyc_rejection_reason}`}
                    {profile?.kyc_status === 'not_submitted' && "Verify your identity to enable full platform access"}
                  </p>
                </div>
              </div>

              <Card className="v56-glass premium-border overflow-hidden rounded-3xl">
                <CardHeader className="p-8 border-b border-white/5 bg-white/5">
                  <CardTitle className="text-xl font-black flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    Personal Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Full Identity Name</Label>
                        <div className="relative">
                          <User className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            className="h-12 pl-12 rounded-xl bg-accent/30 border-white/5 focus:border-primary/50"
                            placeholder="John Doe"
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Secure Contact Phone</Label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="h-12 pl-12 rounded-xl bg-accent/30 border-white/5 focus:border-primary/50 font-mono"
                            placeholder="+1 234 567 890"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Physical Location Address</Label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-4 h-4 w-4 text-muted-foreground" />
                        <Textarea
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="min-h-[100px] pl-12 pt-4 rounded-xl bg-accent/30 border-white/5 focus:border-primary/50"
                          placeholder="123 Elite Ave, Gold City"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Country</Label>
                          <Select value={formData.country} onValueChange={(v) => {
                            setFormData({ ...formData, country: v, state: '', city: '' });
                            setAvailableStates(getStatesForCountry(v));
                          }}>
                            <SelectTrigger className="h-12 rounded-xl bg-accent/30 border-white/5"><SelectValue /></SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                       </div>
                       <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">State/Province</Label>
                          <Select value={formData.state} onValueChange={(v) => {
                            setFormData({ ...formData, state: v, city: '' });
                          }} disabled={!formData.country}>
                            <SelectTrigger className="h-12 rounded-xl bg-accent/30 border-white/5"><SelectValue /></SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {availableStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                       </div>
                       <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Postal Code</Label>
                          <Input
                            value={formData.postal_code}
                            onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                            className="h-12 rounded-xl bg-accent/30 border-white/5 focus:border-primary/50"
                            placeholder="12345"
                          />
                       </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">USDT (BEP-20) Withdrawal Address</Label>
                      <div className="relative">
                        <Wallet className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={formData.withdrawal_wallet_address}
                          onChange={(e) => setFormData({ ...formData, withdrawal_wallet_address: e.target.value })}
                          className="h-12 pl-12 rounded-xl bg-accent/30 border-white/5 focus:border-primary/50 font-mono"
                          placeholder="0x..."
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] premium-gradient shadow-luxury transition-transform active:scale-95" disabled={loading}>
                      {loading ? 'Processing Updates...' : 'Synchronize Identity'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-8 outline-none">
              <Card className="v56-glass premium-border rounded-3xl overflow-hidden">
                <CardHeader className="p-8 border-b border-white/5 bg-white/5">
                  <CardTitle className="text-xl font-black flex items-center gap-3">
                    <Shield className="h-5 w-5 text-primary" />
                    Security Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="space-y-1">
                      <p className="text-sm font-bold">Account Password</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                        {user?.app_metadata?.provider === 'google' 
                          ? 'Set a password for your Google account' 
                          : 'Change your account password'}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-xl"
                      onClick={handleSendPasswordOTP}
                      disabled={isPasswordLoading}
                    >
                      {user?.app_metadata?.provider === 'google' ? 'Set Password' : 'Change Password'}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-bold">Smart Auto-Withdrawal</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Processes on 20th of each month</p>
                    </div>
                    <Switch checked={autoWithdrawal} onCheckedChange={handleAutoWithdrawalToggle} />
                  </div>
                </CardContent>
              </Card>

              {/* Password Change Dialog */}
              <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogContent className="v56-glass premium-border rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-black">
                      {passwordStep === 'otp' ? 'Verify Your Identity' : 'Set New Password'}
                    </DialogTitle>
                    <DialogDescription>
                      {passwordStep === 'otp' 
                        ? `We've sent a 6-digit code to ${user?.email}. Enter it below to proceed.`
                        : 'Please enter your new password below.'}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="py-4 space-y-4">
                    {passwordStep === 'otp' ? (
                      <div className="space-y-2">
                        <Label htmlFor="otp">Verification Code</Label>
                        <Input
                          id="otp"
                          placeholder="000000"
                          value={passwordForm.otp}
                          onChange={(e) => setPasswordForm({ ...passwordForm, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                          className="h-12 text-center text-2xl font-bold tracking-[0.5em]"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="newPassword">New Password</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            placeholder="••••••••"
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                            className="h-12"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirm Password</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                            className="h-12"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <DialogFooter>
                    <Button
                      variant="ghost"
                      onClick={() => setIsPasswordDialogOpen(false)}
                      disabled={isPasswordLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="v56-primary-btn"
                      onClick={passwordStep === 'otp' ? handleVerifyPasswordOTP : handleUpdatePassword}
                      disabled={isPasswordLoading}
                    >
                      {isPasswordLoading ? 'Processing...' : (passwordStep === 'otp' ? 'Verify OTP' : 'Update Password')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

            <TabsContent value="activity" className="space-y-8 outline-none">
              <Card className="v56-glass premium-border rounded-3xl overflow-hidden">
                <CardHeader className="p-8 border-b border-white/5 bg-white/5">
                  <CardTitle className="text-xl font-black flex items-center gap-3">
                    <History className="h-5 w-5 text-primary" />
                    Security Audit Trail
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="space-y-4">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Activity className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold">{log.action}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                              {log.ip_address || 'Internal Session'}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground tabular-nums">
                          {format(new Date(log.created_at), 'MMM dd, HH:mm')}
                        </span>
                      </div>
                    ))}
                    {activityLogs.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground italic text-sm">
                        No activity recorded yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-8">
           <Card className="v56-glass premium-border rounded-3xl overflow-hidden">
             <CardHeader className="p-8 border-b border-white/5 bg-white/5">
                <CardTitle className="text-xl font-black flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  KYC Documents
                </CardTitle>
             </CardHeader>
             <CardContent className="p-8 space-y-6">
                <div className="space-y-3 mb-6">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Select Document Type</Label>
                  <Select 
                    value={documentType} 
                    onValueChange={handleDocumentTypeChange}
                    disabled={isKycLocked}
                  >
                    <SelectTrigger className="h-12 rounded-xl bg-accent/30 border-white/5">
                      <SelectValue placeholder="Select ID type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="license">Driver's License</SelectItem>
                      <SelectItem value="state_id">State ID</SelectItem>
                      <SelectItem value="national_id">National ID</SelectItem>
                    </SelectContent>
                  </Select>
                  {isKycLocked && (
                    <p className="text-[10px] text-primary font-bold animate-pulse mt-2 ml-1">
                      <Lock className="h-3 w-3 inline mr-1" />
                      Documents Locked for Security
                    </p>
                  )}
                </div>

                {documentType && kycDocs.map((doc) => (
                  <div key={doc.id} className="space-y-3">
                    <div className="flex justify-between items-center ml-1">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">{doc.label}</Label>
                      {(profile as any)?.[doc.id] && profile?.kyc_status === 'approved' && (
                        <Badge variant="outline" className="text-[8px] h-4 px-1.5 border-green-500/30 text-green-500 bg-green-500/5 font-black uppercase tracking-tighter">
                          Verified Official
                        </Badge>
                      )}
                    </div>
                    <label className={cn(
                      "flex items-center justify-between p-4 rounded-2xl border border-dashed transition-all group relative",
                      (profile as any)?.[`kyc_${doc.id}`] ? "bg-green-500/5 border-green-500/20" : "bg-white/5 border-white/10 hover:bg-white/10",
                      isKycLocked ? "cursor-not-allowed opacity-80" : "cursor-pointer"
                    )}>
                      {!isKycLocked && (
                        <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, doc.id as any)} accept="image/*" />
                      )}
                      <div className="flex items-center gap-4">
                         <div className={cn(
                           "p-2 rounded-xl bg-accent/50 transition-colors",
                           isKycLocked ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                         )}>
                            {isKycLocked ? <Lock className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                         </div>
                         <div>
                            <p className="text-xs font-bold">
                              {isKycLocked ? "Document Locked" : (profile as any)?.[`kyc_${doc.id}`] ? "Update Document" : "Upload File"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                               {isKycLocked ? "Verification in Progress" : (profile as any)?.[`kyc_${doc.id}`] ? "Document Uploaded - Awaiting Verification" : "Awaiting Upload"}
                            </p>
                         </div>
                      </div>
                      {(profile as any)?.[`kyc_${doc.id}`] ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : isKycLocked ? (
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Upload className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </label>
                    
                    {/* Show uploaded document preview */}
                    {(profile as any)?.[`kyc_${doc.id}`] && (
                      <div className="mt-2 p-3 bg-accent/20 rounded-lg border border-primary/10">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-primary">Uploaded Document Preview</p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.preventDefault();
                              window.open((profile as any)?.[`kyc_${doc.id}`], '_blank');
                            }}
                            className="h-6 text-xs"
                          >
                            View Full Size
                          </Button>
                        </div>
                        <div className="relative rounded-lg overflow-hidden border border-border bg-black/20">
                          <img 
                            src={(profile as any)?.[`kyc_${doc.id}`]} 
                            alt={doc.label}
                            className="w-full h-auto max-h-[200px] object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
