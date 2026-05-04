import { ArrowLeft, DollarSign, TrendingUp, Wallet, FileText, User as UserIcon, Phone, Globe, Mail, Calendar, Shield, Power, Edit2, Users, Save, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReferralTree } from '@/components/common/ReferralTree';
import { supabase } from '@/services/supabase';
import type { Profile } from '@/types';

interface UserStats {
  totalDeposits: number;
  totalWithdrawals: number;
  totalROI: number;
  totalReferralEarnings: number;
  depositCount: number;
  withdrawalCount: number;
  activeDeposits: number;
}

export default function AdminUserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [autoWithdrawal, setAutoWithdrawal] = useState(false);
  const [customRoi, setCustomRoi] = useState<string>('');
  const [userGroup, setUserGroup] = useState<string>('standard');
  const [stats, setStats] = useState<UserStats>({
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalROI: 0,
    totalReferralEarnings: 0,
    depositCount: 0,
    withdrawalCount: 0,
    activeDeposits: 0
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>({});

  const [wallets, setWallets] = useState<any[]>([]);
  useEffect(() => {
    if (userId) {
      loadUserData();
      loadGlobalSettings();
    }
  }, [userId]);

  const loadGlobalSettings = async () => {
    const { data } = await supabase.from('settings').select('*');
    if (data) {
      const settingsObj: any = {};
      (data as any[]).forEach(s => settingsObj[s.key] = s.value);
      setGlobalSettings(settingsObj);
    }
  };

  const loadUserData = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
        setAutoWithdrawal((profileData as any)?.auto_withdrawal_enabled || false);
        setCustomRoi((profileData as any)?.custom_roi_percentage?.toString() || '');
        setUserGroup((profileData as any)?.user_group || 'standard');
      }

      // Load deposits
      const { data: deposits } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Load withdrawals
      const { data: withdrawals } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Load ROI records
      const { data: roiRecords } = await supabase
        .from('roi_records')
        .select('*')
        .eq('user_id', userId);

      // Load referral commissions
      const { data: commissions } = await supabase
        .from('referral_commissions')
        .select('*')
        .eq('referrer_id', userId);

      // Load all transactions
      const { data: txns } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      // Load wallets
      const { data: walletData } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId);
      setWallets(walletData || []);


      setTransactions(txns || []);

      // Calculate stats
      const totalDeposits = (deposits as any[])?.filter(d => d.status === 'approved').reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
      const totalWithdrawals = (withdrawals as any[])?.filter(w => w.status === 'approved').reduce((sum, w) => sum + (w.amount || 0), 0) || 0;
      const totalROI = (roiRecords as any[])?.reduce((sum, r) => sum + (r.roi_amount || 0), 0) || 0;
      const totalReferralEarnings = (commissions as any[])?.reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0;
      const activeDeposits = (deposits as any[])?.filter(d => d.status === 'approved').length || 0;

      setStats({
        totalDeposits,
        totalWithdrawals,
        totalROI,
        totalReferralEarnings,
        depositCount: deposits?.length || 0,
        withdrawalCount: withdrawals?.length || 0,
        activeDeposits
      });
    } catch (error) {
      console.error('Failed to load user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const getKYCStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
      not_submitted: 'outline'
    };
    return <Badge variant={variants[status] || 'outline'}>{status.replace('_', ' ').toUpperCase()}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    return role === 'admin' ? (
      <Badge variant="default" className="bg-primary">ADMIN</Badge>
    ) : (
      <Badge variant="outline">USER</Badge>
    );
  };

  const calculateNextWithdrawalDate = () => {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // If current date is before 20th, next payout is 20th of current month
    // If current date is on or after 20th, next payout is 20th of next month
    if (currentDay < 20) {
      return new Date(currentYear, currentMonth, 20).toISOString();
    } else {
      return new Date(currentYear, currentMonth + 1, 20).toISOString();
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-center text-muted-foreground">Loading user details...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <p className="text-center text-muted-foreground">User not found</p>
        <div className="flex justify-center mt-4">
          <Button onClick={() => navigate('/admin/users')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
          <Button variant="outline" onClick={() => navigate('/admin/users')} className="w-full sm:w-auto">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black v56-gradient-text tracking-tighter">User Intelligence</h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground opacity-70">Comprehensive Profile & Network Audit</p>
          </div>
        </div>
      </div>

      {/* User Info Card */}
      <Card className="v56-glass premium-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-primary" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                Full Name
              </p>
              <p className="font-semibold">{profile.full_name || 'Not provided'}</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Button 
            variant="destructive" 
            className="w-full sm:w-auto mt-4 sm:mt-0 font-bold uppercase tracking-widest text-xs h-10 px-6 rounded-xl"
            onClick={async () => {
              if (confirm('CRITICAL: Are you sure you want to permanently delete this user? This will remove all their data and terminate all active sessions immediately.')) {
                const { invokeEdgeFunction } = await import('@/services/functions');
                const { error } = await invokeEdgeFunction('delete-user', {
                  body: { userId: userId }
                });
                
                if (error) {
                  toast.error(`Deletion failed: ${(error as any).message}`);
                } else {
                  toast.success('User deleted and sessions terminated');
                  navigate('/admin/users');
                }
              }
            }}
          >
            Delete User Account
          </Button>

                <Mail className="h-4 w-4" />
                Email
              </p>
              <p className="font-semibold">{profile.email || 'Not provided'}</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </p>
              <p className="font-semibold">{profile.phone || 'Not provided'}</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Country
              </p>
              <p className="font-semibold">{profile.country || 'Not provided'}</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Joined
              </p>
              <p className="font-semibold">{new Date(profile.created_at).toLocaleDateString()}</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Withdrawal Wallet
              </p>
              <p className="font-mono text-xs break-all bg-muted p-1 rounded">
                {(profile as any).withdrawal_wallet_address || 'Not set'}
              </p>
            </div>

            <div className="pt-4 border-t border-border col-span-full mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div className="space-y-2">
                  <Label htmlFor="user-group" className="flex items-center gap-2 text-primary">
                    <Users className="h-4 w-4" />
                    User Group (for ROI Adjustments)
                  </Label>
                  <div className="flex gap-2">
                    <Input 
                      id="user-group"
                      placeholder="e.g. standard, VIP"
                      value={userGroup}
                      onChange={(e) => setUserGroup(e.target.value)}
                      className="v56-glass-input"
                    />
                    <Button 
                      onClick={async () => {
                        const { error } = await (supabase
                          .from('profiles') as any)
                          .update({ user_group: userGroup })
                          .eq('id', profile.id);
                        
                        if (error) {
                          toast.error(`Failed to update User Group: ${(error as any).message}`);
                        } else {
                          toast.success('User Group updated');
                          // @ts-ignore
                          setProfile({ ...profile, user_group: userGroup });
                        }
                      }}
                      className="premium-gradient text-white"
                    >
                      Update Group
                    </Button>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pb-2">
                  <Switch
                    id="auto-withdrawal"
                    checked={autoWithdrawal}
                    onCheckedChange={async (checked) => {
                      setAutoWithdrawal(checked);
                      const { error } = await (supabase
                        .from('profiles') as any)
                        .update({ auto_withdrawal_enabled: checked })
                        .eq('id', profile.id);
                      
                      if (error) {
                        toast.error(`Update failed: ${(error as any).message}`);
                      } else {
                        toast.success(`Auto-withdrawal ${checked ? 'enabled' : 'disabled'}`);
                      }
                    }}
                  />
                  <Label htmlFor="auto-withdrawal">Enable Auto-Withdrawal on 20th</Label>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Role & KYC
              </p>
              <div className="flex gap-2">
                {getRoleBadge(profile.role)}
                {getKYCStatusBadge(profile.kyc_status)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ROI Information & Individual Overrides */}
      <Card className="v56-glass premium-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              ROI Information
            </CardTitle>
            <CardDescription>
              Manage individual ROI settings and commission overrides
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="gold-border hover:bg-primary/10"
            onClick={() => {
              if (!globalSettings) {
                toast.error('Global settings not loaded');
                return;
              }
              
              const updatedOverrides = { ...((profile as any).referral_levels_overrides || {}) };
              for (let i = 1; i <= 15; i++) {
                const key = `level${i}_commission`;
                if (globalSettings[key]) {
                  updatedOverrides[key] = Number(globalSettings[key]);
                }
              }

              // Update state locally
              setCustomRoi(globalSettings.monthly_roi || '10');
              const target = globalSettings.target_usdt || '1000';
              
              // @ts-ignore
              setProfile({
                ...profile,
                custom_roi_percentage: Number(globalSettings.monthly_roi || 10),
                target_usdt: Number(target),
                referral_levels_overrides: updatedOverrides
              });
              
              toast.success('Platform defaults applied to view (Click "Save All ROI Settings" to persist)');
            }}
          >
            <Zap className="h-4 w-4 mr-2 text-primary" />
            Apply Default Settings
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-bold">Individual Monthly ROI (%)</Label>
              <Input 
                type="number" 
                step="0.1" 
                value={customRoi} 
                onChange={e => setCustomRoi(e.target.value)} 
                className="v56-glass-input"
              />
              <p className="text-[10px] text-muted-foreground italic">Overrides platform default for this specific user.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold">Target USDT (Wealth Projection)</Label>
              <Input 
                type="number" 
                value={(profile as any).target_usdt || 1000} 
                onChange={e => setProfile({...profile, target_usdt: Number(e.target.value)} as any)} 
                className="v56-glass-input"
              />
              <p className="text-[10px] text-muted-foreground italic">Target amount used in this user's wealth projection hub.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-px bg-white/5 flex-1" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Level Commission Overrides</span>
              <div className="h-px bg-white/5 flex-1" />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {Array.from({ length: 15 }, (_, i) => i + 1).map((lvl) => {
                const key = `level${lvl}_commission`;
                const overrides = (profile as any).referral_levels_overrides || {};
                const isOverridden = overrides[key] !== undefined;
                return (
                  <div key={lvl} className={`space-y-1 p-2 rounded-lg border ${isOverridden ? 'bg-primary/5 border-primary/20' : 'bg-white/5 border-white/5'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <Label className="text-[10px] font-bold">Level {lvl}</Label>
                      {isOverridden && <span className="text-[8px] bg-primary text-primary-foreground px-1 rounded-sm">Override</span>}
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={globalSettings[key] || '0'}
                      value={overrides[key] ?? ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? undefined : Number(e.target.value);
                        const updatedOverrides = { ...overrides };
                        if (val === undefined) {
                          delete updatedOverrides[key];
                        } else {
                          updatedOverrides[key] = val;
                        }
                        setProfile({ ...profile, referral_levels_overrides: updatedOverrides } as any);
                      }}
                      className="h-7 text-xs bg-transparent"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-white/5">
            <Button 
              className="premium-gradient text-white"
              onClick={async () => {
                try {
                  const { error } = await (supabase
                    .from('profiles') as any)
                    .update({
                      custom_roi_percentage: customRoi === '' ? null : parseFloat(customRoi),
                      target_usdt: (profile as any).target_usdt,
                      referral_levels_overrides: (profile as any).referral_levels_overrides
                    })
                    .eq('id', profile.id);

                  if (error) throw error;
                  toast.success('ROI Settings saved successfully');
                } catch (error: unknown) {
                  toast.error(`Failed to save settings: ${(error as any).message}`);
                }
              }}
            >
              <Save className="h-4 w-4 mr-2" />
              Save All ROI Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Withdrawal Management */}
      <Card className="v56-glass premium-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Power className="h-5 w-5 text-primary" />
            Auto-Withdrawal Settings
          </CardTitle>
          <CardDescription>
            Manage automatic withdrawal settings for this user
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-withdrawal" className="text-base">
                Enable Auto-Withdrawal
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically process withdrawals for this user during payout windows (15th-25th of each month)
              </p>
            </div>
            <Switch
              id="auto-withdrawal"
              checked={autoWithdrawal}
              onCheckedChange={async (checked) => {
                if (!userId) return;
                
                try {
                  const nextDate = checked ? calculateNextWithdrawalDate() : null;
                  const { error } = await (supabase as any)
                    .from('profiles')
                    .update({
                      auto_withdrawal_enabled: checked,
                      next_auto_withdrawal_date: nextDate
                    })
                    .eq('id', userId);

                  if (error) throw error;

                  setAutoWithdrawal(checked);
                  toast.success(
                    checked
                      ? 'Auto-withdrawal enabled for user'
                      : 'Auto-withdrawal disabled for user'
                  );
                  loadUserData();
                } catch (error) {
                  console.error('Failed to update auto-withdrawal:', error);
                  toast.error('Failed to update auto-withdrawal setting');
                }
              }}
            />
          </div>
          {autoWithdrawal && (profile as any)?.next_auto_withdrawal_date && (
            <div className="mt-4 p-3 bg-accent rounded-lg">
              <p className="text-sm">
                <span className="font-medium">Next Auto-Withdrawal:</span>{' '}
                {new Date((profile as any).next_auto_withdrawal_date).toLocaleDateString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {/* Referral Commission Level Toggles */}
      <Card className="v56-glass premium-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>Referral Commission Access</CardTitle>
          </div>
          <CardDescription>
            Enable or disable specific referral levels for this user.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {Array.from({ length: 15 }, (_, i) => {
              const level = i + 1;
              const field = `referral_level_${level}_enabled`;
              const isEnabled = (profile as any)[field] ?? (level <= 4);
              
              return (
                <div key={level} className="flex items-center justify-between p-3 rounded-xl bg-accent/20 border border-white/5">
                  <div className="space-y-0.5">
                    <Label htmlFor={`level-${level}`} className="text-xs font-bold">Level {level}</Label>
                    <p className="text-[10px] text-muted-foreground">{isEnabled ? 'Active' : 'Locked'}</p>
                  </div>
                  <Switch
                    id={`level-${level}`}
                    checked={isEnabled}
                    onCheckedChange={async (checked) => {
                      try {
                        const { error } = await (supabase
                          .from('profiles') as any)
                          .update({ [field]: checked })
                          .eq('id', profile.id);

                        if (error) throw error;

                        toast.success(`Level ${level} ${checked ? 'enabled' : 'disabled'} for user`);
                        const updatedProfile = { ...profile, [field]: checked };
                        setProfile(updatedProfile as any);
                      } catch (error: unknown) {
                        toast.error(`Failed to update level: ${(error as any).message}`);
                      }
                    }}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="v56-glass premium-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Total Deposits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">${stats.totalDeposits.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.depositCount} deposits</p>
          </CardContent>
        </Card>

        <Card className="v56-glass premium-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4 text-blue-500" />
              Total Withdrawals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-500">${stats.totalWithdrawals.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.withdrawalCount} withdrawals</p>
          </CardContent>
        </Card>

        <Card className="v56-glass premium-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Total ROI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">${stats.totalROI.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">Lifetime earnings</p>
          </CardContent>
        </Card>

        <Card className="v56-glass premium-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-yellow-500" />
              Referral Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-500">${stats.totalReferralEarnings.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">Commission earned</p>
          </CardContent>
        </Card>
      </div>
      {/* Wallet Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {wallets.map((wallet: any) => (
          <Card key={wallet.id} className="v56-glass premium-border border-primary/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 uppercase">
                <Wallet className="h-4 w-4 text-primary" />
                {wallet.wallet_type} Wallet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">${Number(wallet.balance).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">Current balance</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Management */}
      <Card className="v56-glass premium-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Direct Referral Performance
            </CardTitle>
            <CardDescription>
              Manage this user's referral performance data and status
            </CardDescription>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2">
                <Edit2 className="h-4 w-4" />
                Edit Performance
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] duration-0 animate-none fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]">
              <DialogHeader>
                <DialogTitle>Edit Referral Performance</DialogTitle>
                <DialogDescription>
                  Modify performance metrics for {profile.email}. All changes are audited.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="performance_usdt" className="text-right">Vol (USDT)</Label>
                  <Input
                    id="performance_usdt"
                    type="number"
                    className="col-span-3"
                    defaultValue={profile.performance_usdt || 0}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="performance_contribution" className="text-right">Performance Fund</Label>
                  <Input
                    id="performance_contribution"
                    type="number"
                    className="col-span-3"
                    defaultValue={(profile as any).performance_contribution || 0}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="manual_level_1_count" className="text-right">Direct Refs</Label>
                  <Input
                    id="manual_level_1_count"
                    type="number"
                    className="col-span-3"
                    defaultValue={profile.manual_level_1_count || 0}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="performance_score" className="text-right">Score</Label>
                  <Input
                    id="performance_score"
                    type="number"
                    className="col-span-3"
                    defaultValue={profile.performance_score || 0}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="performance_ranking" className="text-right">Ranking</Label>
                  <Select onValueChange={(val) => (window as any)._performance_ranking = val} defaultValue={profile.performance_ranking || 'Regular'}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select rank" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Regular">Regular</SelectItem>
                      <SelectItem value="Silver">Silver</SelectItem>
                      <SelectItem value="Gold">Gold</SelectItem>
                      <SelectItem value="Platinum">Platinum</SelectItem>
                      <SelectItem value="Diamond">Diamond</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="referral_system_status" className="text-right">Status</Label>
                  <Select onValueChange={(val) => (window as any)._referral_system_status = val} defaultValue={profile.referral_system_status || 'Active'}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Suspended">Suspended</SelectItem>
                      <SelectItem value="Probation">Probation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={async () => {
                  const performance_usdt = parseFloat((document.getElementById('performance_usdt') as HTMLInputElement).value);
                  const performance_contribution = parseFloat((document.getElementById('performance_contribution') as HTMLInputElement).value);
                  const manual_level_1_count = parseInt((document.getElementById('manual_level_1_count') as HTMLInputElement).value);
                  const performance_score = parseFloat((document.getElementById('performance_score') as HTMLInputElement).value);
                  const performance_ranking = (window as any)._performance_ranking || profile.performance_ranking || 'Regular';
                  const referral_system_status = (window as any)._referral_system_status || profile.referral_system_status || 'Active';
                  
                  try {
                    const updates = {
                      performance_usdt,
                      performance_contribution,
                      manual_level_1_count,
                      performance_score,
                      performance_ranking,
                      referral_system_status
                    };
                    
                    const { error } = await (supabase as any).from('profiles').update(updates).eq('id', userId);
                    if (error) throw error;
                    
                    // Audit log with summary
                    const { data: { user: admin } } = await supabase.auth.getUser();
                    const summary = `Updated Performance: USDT Vol (${profile.performance_usdt}->${performance_usdt}), Fund (${(profile as any).performance_contribution}->${performance_contribution}), Refs (${profile.manual_level_1_count}->${manual_level_1_count}), Score (${profile.performance_score}->${performance_score}), Rank (${profile.performance_ranking}->${performance_ranking}), Status (${profile.referral_system_status}->${referral_system_status})`;
                    
                    await (supabase as any).from('activity_logs').insert({
                      user_id: userId,
                      action: 'admin_performance_edit',
                      description: `Admin edited performance for user ${profile.email}`,
                      metadata: { 
                        admin_id: admin?.id,
                        summary: summary,
                        updates: updates,
                        previous: {
                          performance_usdt: profile.performance_usdt,
                          manual_level_1_count: profile.manual_level_1_count,
                          performance_score: profile.performance_score,
                          performance_ranking: profile.performance_ranking,
                          referral_system_status: profile.referral_system_status
                        }
                      }
                    });
                    
                    toast.success('Performance updated successfully');
                    loadUserData();
                  } catch (e) {
                    toast.error('Failed to update performance');
                  }
                }}>
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-4 rounded-xl bg-accent/20 border border-white/5 space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Main Metrics</p>
                <Badge variant={profile.referral_system_status === 'Active' ? 'default' : 'destructive'}>
                  {profile.referral_system_status || 'Active'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase text-muted-foreground">USDT Volume</p>
                  <p className="text-lg font-bold">${Number(profile.performance_usdt || 0).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase text-muted-foreground">Direct Refs</p>
                  <p className="text-lg font-bold">{profile.manual_level_1_count || 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase text-muted-foreground">Rank</p>
                  <p className="text-lg font-bold text-primary">{profile.performance_ranking || 'Regular'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase text-muted-foreground">Score</p>
                  <p className="text-lg font-bold">{profile.performance_score || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-xl bg-accent/20 border border-white/5 space-y-4">
              <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Team Stats</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs">Real Referral Count</span>
                  <span className="font-bold">{(profile as any).level_1_count || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs">Contribution Value</span>
                  <span className="font-bold text-primary">${Number((profile as any).performance_contribution || 0).toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-white/5">
                  <p className="text-[10px] text-muted-foreground italic">Note: These values are derived from real network data.</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Tabs for detailed views */}
      <Tabs defaultValue="referrals" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 lg:w-auto">
          <TabsTrigger value="referrals">Referral Tree</TabsTrigger>
          <TabsTrigger value="performance">Performance Levels</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="wallets">User Wallets</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card className="v56-glass premium-border">
            <CardHeader>
              <CardTitle>Level Management (5-15)</CardTitle>
              <CardDescription>
                Current Performance: <span className="text-primary font-bold">{(profile as any)?.performance_usdt || 0} USDT</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 11 }).map((_, i) => {
                  const level = i + 5;
                  const target = [10000, 25000, 50000, 75000, 100000, 150000, 200000, 300000, 400000, 500000, 1000000][i];
                  const isCurrentlyEnabled = (profile as any)?.[`referral_level_${level}_enabled` as keyof Profile];
                  const override = (profile as any)?.referral_levels_overrides?.[`level_${level}`];
                  
                  return (
                    <div key={level} className="p-4 rounded-xl border border-white/5 bg-accent/20 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold">Level {level}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Target: {target.toLocaleString()} USDT</p>
                        </div>
                        <Badge variant={isCurrentlyEnabled ? "default" : "secondary"}>
                          {isCurrentlyEnabled ? "ACTIVE" : "LOCKED"}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 pt-2 border-t border-white/5">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Admin Override</p>
                        <div className="flex items-center gap-4">
                          <Button 
                            size="sm" 
                            variant={override === true ? "default" : "outline"}
                            className="flex-1 h-8 text-xs"
                            onClick={async () => {
                              const newOverrides = { ...((profile as any)?.referral_levels_overrides || {}), [`level_${level}`]: true };
                              const { error } = await (supabase as any).from('profiles').update({ referral_levels_overrides: newOverrides }).eq('id', userId);
                              if (error) toast.error('Error');
                              else {
                                await (supabase as any).rpc('check_and_enable_referral_levels', { referrer_uid: userId });
                                loadUserData();
                                toast.success(`Level ${level} manually ENABLED`);
                              }
                            }}
                          >
                            FORCE ENABLE
                          </Button>
                          <Button 
                            size="sm" 
                            variant={override === false ? "destructive" : "outline"}
                            className="flex-1 h-8 text-xs"
                            onClick={async () => {
                              const newOverrides = { ...((profile as any)?.referral_levels_overrides || {}), [`level_${level}`]: false };
                              const { error } = await (supabase as any).from('profiles').update({ referral_levels_overrides: newOverrides }).eq('id', userId);
                              if (error) toast.error('Error');
                              else {
                                await (supabase as any).rpc('check_and_enable_referral_levels', { referrer_uid: userId });
                                loadUserData();
                                toast.success(`Level ${level} manually DISABLED`);
                              }
                            }}
                          >
                            FORCE DISABLE
                          </Button>
                        </div>
                        {override !== undefined && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full h-8 text-xs text-muted-foreground hover:text-primary"
                            onClick={async () => {
                              const newOverrides = { ...((profile as any)?.referral_levels_overrides || {}) };
                              delete newOverrides[`level_${level}`];
                              const { error } = await (supabase as any).from('profiles').update({ referral_levels_overrides: newOverrides }).eq('id', userId);
                              if (error) toast.error('Error');
                              else {
                                await (supabase as any).rpc('check_and_enable_referral_levels', { referrer_uid: userId });
                                loadUserData();
                                toast.success(`Level ${level} set to AUTO`);
                              }
                            }}
                          >
                            RESET TO AUTO
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-4">
          <ReferralTree userId={userId!} />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card className="v56-glass premium-border">
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>Last 50 transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {transactions.length > 0 ? (
                  transactions.map((txn) => (
                    <div key={txn.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{txn.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(txn.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${txn.amount?.toFixed(2) || '0.00'}</p>
                        <Badge variant={txn.status === 'completed' ? 'default' : 'secondary'}>
                          {txn.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">No transactions found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallets" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {wallets.map((wallet) => (
              <Card key={wallet.id} className="v56-glass premium-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                    <Wallet className="h-3 w-3 text-primary" />
                    {wallet.wallet_type.replace('_', ' ')} Wallet
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-black tabular-nums italic text-glow-sm">
                    ${Number(wallet.balance).toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="v56-glass premium-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Wallet Transaction Mirror
              </CardTitle>
              <CardDescription>Exact transaction logs as seen by the user</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${tx.transaction_type === 'deposit' || tx.transaction_type === 'roi_credit' || tx.transaction_type === 'referral_commission' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {tx.transaction_type === 'deposit' || tx.transaction_type === 'roi_credit' || tx.transaction_type === 'referral_commission' ? <TrendingUp className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-bold uppercase text-xs tracking-widest">{tx.transaction_type.replace('_', ' ')}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-black italic ${tx.transaction_type === 'deposit' || tx.transaction_type === 'roi_credit' || tx.transaction_type === 'referral_commission' ? 'text-green-500' : 'text-red-500'}`}>
                          {tx.transaction_type === 'deposit' || tx.transaction_type === 'roi_credit' || tx.transaction_type === 'referral_commission' ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                        </p>
                        <Badge variant="outline" className="text-[9px] h-4">{tx.status.toUpperCase()}</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">No transaction history for this user</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
