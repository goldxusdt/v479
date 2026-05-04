import { Edit, Search, Download, UserPlus, Trash2, Filter, FileText, Trash, Zap, ShieldAlert, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { invokeEdgeFunction } from '@/services/functions';
import { supabase } from '@/services/supabase';
import { cn } from '@/utils/utils';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { exportToCSV } from '@/utils/csv-export';

export default function AdminUsersPage() {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const kycFilter = searchParams.get('kyc') || 'all';
  
  const [users, setUsers] = useState<any[]>([]);
  const [, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [kycDocsDialogOpen, setKycDocsDialogOpen] = useState(false);
  const [userDocs, setUserDocs] = useState<any[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>({});
  
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    role: 'user',
    user_group: 'standard',
    is_active: true,
    monthly_roi_percentage: 10,
    target_usdt: 1000,
    referral_levels_overrides: {} as any,
    referral_level_targets: {} as any,
    deposit_balance: 0,
    roi_balance: 0,
    bonus_balance: 0,
    withdrawal_balance: 0,
    referral_level_1_enabled: true,
    referral_level_2_enabled: true,
    referral_level_3_enabled: true,
    referral_level_4_enabled: true,
    referral_level_5_enabled: false,
    referral_level_6_enabled: false,
    referral_level_7_enabled: false,
    referral_level_8_enabled: false,
    referral_level_9_enabled: false,
    referral_level_10_enabled: false,
    referral_level_11_enabled: false,
    referral_level_12_enabled: false,
    referral_level_13_enabled: false,
    referral_level_14_enabled: false,
    referral_level_15_enabled: false,
  });

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'user' as 'user' | 'admin'
  });

  const [isLiveRefresh, setIsLiveRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadGlobalSettings = async () => {
    const { data } = await supabase.from('settings').select('*');
    if (data) {
      const settingsObj: any = {};
      (data as any[]).forEach(s => settingsObj[s.key] = s.value);
      setGlobalSettings(settingsObj);
    }
  };

  const loadUsers = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      let query = supabase.from('admin_user_summary').select('*');
      
      if (kycFilter !== 'all') {
        query = query.eq('kyc_status', kycFilter);
      }
      
      const { data: usersData, error: usersError } = await query.order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Load referral stats in bulk for current users
      const { data: referralStatsData } = await supabase
        .from('user_referral_level_stats')
        .select('*')
        .in('user_id', (usersData || []).map((u: any) => u.id));

      const combinedData = (usersData || []).map((user: any) => {
        const referralStats = (referralStatsData || []).filter((s: any) => s.user_id === user.id);
        return {
          ...user,
          referral_stats: referralStats
        };
      });

      setUsers(combinedData);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [kycFilter]);

  useEffect(() => {
    loadUsers();
    loadGlobalSettings();

    // Real-time subscription for users and their wallets
    const usersChannel = supabase
      .channel('admin_users_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        loadUsers(false);
      })
      .subscribe();

    const walletsChannel = supabase
      .channel('admin_users_wallets_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, () => {
        loadUsers(false);
      })
      .subscribe();

    let interval: NodeJS.Timeout;
    if (isLiveRefresh) {
      interval = setInterval(() => {
        loadUsers(false);
      }, 30000);
    }

    return () => {
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(walletsChannel);
      if (interval) clearInterval(interval);
    };
  }, [loadUsers, isLiveRefresh]);

  const handleOpenEdit = (user: any) => {
    setSelectedUser(user);
    setEditForm({
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      state: user.state || '',
      country: user.country || '',
      postal_code: user.postal_code || '',
      role: user.role,
      user_group: user.user_group || 'standard',
      is_active: user.is_active,
      monthly_roi_percentage: Number(user.monthly_roi_percentage || 10),
      target_usdt: Number(user.target_usdt || 1000),
      referral_levels_overrides: user.referral_levels_overrides || {},
      referral_level_targets: user.referral_level_targets || {},
      deposit_balance: Number(user.deposit),
      roi_balance: Number(user.roi),
      bonus_balance: Number(user.bonus),
      withdrawal_balance: Number(user.withdrawal),
      referral_level_1_enabled: user.referral_level_1_enabled !== false,
      referral_level_2_enabled: user.referral_level_2_enabled !== false,
      referral_level_3_enabled: user.referral_level_3_enabled !== false,
      referral_level_4_enabled: user.referral_level_4_enabled !== false,
      referral_level_5_enabled: !!user.referral_level_5_enabled,
      referral_level_6_enabled: !!user.referral_level_6_enabled,
      referral_level_7_enabled: !!user.referral_level_7_enabled,
      referral_level_8_enabled: !!user.referral_level_8_enabled,
      referral_level_9_enabled: !!user.referral_level_9_enabled,
      referral_level_10_enabled: !!user.referral_level_10_enabled,
      referral_level_11_enabled: !!user.referral_level_11_enabled,
      referral_level_12_enabled: !!user.referral_level_12_enabled,
      referral_level_13_enabled: !!user.referral_level_13_enabled,
      referral_level_14_enabled: !!user.referral_level_14_enabled,
      referral_level_15_enabled: !!user.referral_level_15_enabled,
    } as any);
    setEditDialogOpen(true);
  };

  const applyDefaults = () => {
    const updatedOverrides = { ...editForm.referral_levels_overrides };
    const updatedTargets = { ...editForm.referral_level_targets };
    
    // Populate missing levels based on globalSettings
    for (let i = 1; i <= 15; i++) {
      const key = `level${i}_commission`;
      if (globalSettings[key]) {
        updatedOverrides[key] = Number(globalSettings[key]);
      }
      
      const targetKey = `level${i}_target`;
      if (globalSettings[targetKey]) {
        updatedTargets[targetKey] = Number(globalSettings[targetKey]);
      }
    }

    setEditForm({
      ...editForm,
      monthly_roi_percentage: Number(globalSettings.monthly_roi || 10),
      target_usdt: Number(globalSettings.target_usdt || 1000),
      referral_levels_overrides: updatedOverrides,
      referral_level_targets: updatedTargets
    });
    
    toast.success('Platform default values applied to form');
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    try {
      // 1. Update Profile
      const { error: profileError } = await (supabase
        .from('profiles') as any)
        .update({
          full_name: editForm.full_name,
          email: editForm.email,
          phone: editForm.phone,
          address: editForm.address,
          city: editForm.city,
          state: editForm.state,
          country: editForm.country,
          postal_code: editForm.postal_code,
          role: editForm.role as any,
          user_group: editForm.user_group,
          is_active: editForm.is_active,
          monthly_roi_percentage: editForm.monthly_roi_percentage,
          target_usdt: editForm.target_usdt,
          referral_levels_overrides: editForm.referral_levels_overrides,
          referral_level_targets: editForm.referral_level_targets,
          referral_level_1_enabled: editForm.referral_level_1_enabled,
          referral_level_2_enabled: editForm.referral_level_2_enabled,
          referral_level_3_enabled: editForm.referral_level_3_enabled,
          referral_level_4_enabled: editForm.referral_level_4_enabled,
          referral_level_5_enabled: editForm.referral_level_5_enabled,
          referral_level_6_enabled: editForm.referral_level_6_enabled,
          referral_level_7_enabled: editForm.referral_level_7_enabled,
          referral_level_8_enabled: editForm.referral_level_8_enabled,
          referral_level_9_enabled: editForm.referral_level_9_enabled,
          referral_level_10_enabled: editForm.referral_level_10_enabled,
          referral_level_11_enabled: editForm.referral_level_11_enabled,
          referral_level_12_enabled: editForm.referral_level_12_enabled,
          referral_level_13_enabled: editForm.referral_level_13_enabled,
          referral_level_14_enabled: editForm.referral_level_14_enabled,
          referral_level_15_enabled: editForm.referral_level_15_enabled,
        } as any)
        .eq('id', selectedUser.id);

      if (profileError) throw profileError;

      // 2. Update Wallets
      const walletUpdates = [
        { type: 'deposit', balance: editForm.deposit_balance },
        { type: 'roi', balance: editForm.roi_balance },
        { type: 'bonus', balance: editForm.bonus_balance },
        { type: 'withdrawal', balance: editForm.withdrawal_balance }
      ];

      for (const w of walletUpdates) {
        await (supabase
          .from('wallets') as any)
          .update({ balance: w.balance })
          .eq('user_id', selectedUser.id)
          .eq('wallet_type', w.type);
      }

      toast.success('User updated successfully');
      setEditDialogOpen(false);
      loadUsers();
    } catch (error) {
      console.error('Update failed:', error);
      toast.error('Failed to update user');
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (newUser.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      const { error } = await invokeEdgeFunction('create-user', {
        body: newUser
      });

      if (error) {
        throw error;
      }

      toast.success('User created successfully');
      setCreateDialogOpen(false);
      setNewUser({ email: '', password: '', full_name: '', role: 'user' });
      loadUsers();
    } catch (error: unknown) {
      console.error('Creation failed:', error);
      toast.error((error as any).message || 'Failed to create user');
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      const { error } = await invokeEdgeFunction('delete-user', {
        body: { user_id: id }
      });
      if (error) throw error;
      toast.success('User deleted');
      loadUsers();
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const loadDocs = async (userId: string) => {
    // Load KYC documents from profile fields
    const { data: profileData } = await (supabase
      .from('profiles')
      .select('kyc_id_front, kyc_id_back, kyc_selfie, kyc_ocr_text, kyc_document_type')
      .eq('id', userId)
      .single() as any);
    
    if (!profileData) {
      setUserDocs([]);
      return;
    }

    const docTypeLabel = profileData.kyc_document_type ? profileData.kyc_document_type.toUpperCase() : 'ID';

    // Convert profile fields to document array format
    const docs: any[] = [];
    if (profileData.kyc_id_front) {
      docs.push({
        id: 'id_front',
        document_type: `${docTypeLabel} Front`,
        file_url: profileData.kyc_id_front,
        ocr_text: profileData.kyc_ocr_text
      });
    }
    if (profileData.kyc_id_back) {
      docs.push({
        id: 'id_back',
        document_type: `${docTypeLabel} Back`,
        file_url: profileData.kyc_id_back
      });
    }
    if (profileData.kyc_selfie) {
      docs.push({
        id: 'selfie',
        document_type: 'Selfie',
        file_url: profileData.kyc_selfie
      });
    }
    
    setUserDocs(docs);
  };

  const handleOpenDocs = (user: any) => {
    setSelectedUser(user);
    loadDocs(user.id);
    setKycDocsDialogOpen(true);
  };

  const handleDeleteDoc = async (docId: string) => {
    // Update profile to remove the document URL
    const updateData: Record<string, null> = {};
    if (docId === 'id_front') updateData.kyc_id_front = null;
    if (docId === 'id_back') updateData.kyc_id_back = null;
    if (docId === 'selfie') updateData.kyc_selfie = null;
    
    const { error } = await (supabase
      .from('profiles') as any)
      .update(updateData)
      .eq('id', selectedUser.id);
      
    if (error) toast.error('Failed to delete document');
    else {
      toast.success('Document deleted');
      loadDocs(selectedUser.id);
    }
  };

  const handleUpdateKycStatus = async (status: string) => {
    const { error } = await (supabase
      .from('profiles') as any)
      .update({ kyc_status: status as any })
      .eq('id', selectedUser.id);
    
    if (error) toast.error('Failed to update status');
    else {
      toast.success(`KYC status updated to ${status}`);
      loadUsers();
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold v56-gradient-text">User Management</h1>
          <p className="text-muted-foreground">Manage accounts and segments</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadUsers()} 
            className="v56-glass border-white/10 uppercase font-black text-[10px] tracking-widest h-10 px-4"
          >
            <RefreshCw className="mr-2 h-3 w-3" />
            Refresh
          </Button>
          <Button 
            variant={isLiveRefresh ? "default" : "outline"} 
            size="sm" 
            onClick={() => setIsLiveRefresh(!isLiveRefresh)} 
            className="v56-glass border-white/10 uppercase font-black text-[10px] tracking-widest h-10 px-4"
          >
            <RefreshCw className={cn("mr-2 h-3 w-3", isLiveRefresh && "animate-pulse text-green-500")} />
            {isLiveRefresh ? 'Live ON' : 'Live OFF'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportToCSV(users, 'users_export')} className="v56-glass border-white/10 uppercase font-black text-[10px] tracking-widest h-10 px-4">
            <Download className="mr-2 h-3 w-3" />
            Export CSV
          </Button>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)} className="premium-gradient uppercase font-black text-[10px] tracking-widest h-10 px-4">
            <UserPlus className="mr-2 h-3 w-3" />
            Create User
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search email or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
      <div className="text-[10px] uppercase font-bold text-muted-foreground opacity-60">
        Last update: {format(lastRefresh, 'HH:mm:ss')}
      </div>

        </div>
        <Select value={kycFilter} onValueChange={(v) => setSearchParams({ kyc: v })}>
          <SelectTrigger className="w-full md:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="KYC Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All KYC Status</SelectItem>
            <SelectItem value="not_submitted">Not Submitted</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="v56-glass premium-border">
        <CardContent className="p-0">
          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-border">
            {filteredUsers.map((user) => (
              <div key={user.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="font-bold text-base">{user.full_name || 'No Name'}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </div>
                  <Badge className={cn(
                    "text-[10px] uppercase font-bold",
                    user.kyc_status === 'approved' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                    user.kyc_status === 'rejected' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                    user.kyc_status === 'pending' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                    "bg-gray-500/10 text-gray-500 border-gray-500/20"
                  )}>
                    {user.kyc_status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 py-2 border-y border-white/5">
                  <div className="space-y-0.5">
                    <div className="text-[10px] uppercase font-black text-muted-foreground">ROI Balance</div>
                    <div className="font-bold text-primary">${Number(user.roi || 0).toFixed(2)}</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[10px] uppercase font-black text-muted-foreground">Deposit Balance</div>
                    <div className="font-bold text-blue-500">${Number(user.deposit || 0).toFixed(2)}</div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold">
                    Joined: {user.created_at ? format(new Date(user.created_at), 'MMM dd, yyyy') : 'N/A'}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(user)} className="h-8 w-8 rounded-lg bg-accent/50">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="v56-glass premium-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete User?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {user.email}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="p-8 text-center text-muted-foreground italic">No users found matching filters</div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-accent/50">
                <tr>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">KYC Status</th>
                  <th className="px-6 py-3 text-right">Balances (USDT)</th>
                  <th className="px-6 py-3 text-right">Total Fees</th>
                  <th className="px-6 py-3 text-center">Joined</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold">{user.full_name || 'No Name'}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold w-fit ${
                          user.kyc_status === 'approved' ? 'bg-green-500/20 text-green-500' :
                          user.kyc_status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                          user.kyc_status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                          'bg-gray-500/20 text-gray-500'
                        }`}>
                          {user.kyc_status.replace('_', ' ')}
                        </span>
                        {user.kyc_document_type && (
                          <span className="text-[9px] uppercase font-black text-primary/70 tracking-tighter pl-1">
                            {user.kyc_document_type}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-xs">
                        <span className="text-muted-foreground">Dep:</span> {Number(user.deposit || 0).toFixed(2)} | 
                        <span className="text-muted-foreground"> ROI:</span> {Number(user.roi || 0).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Bonus: {Number(user.bonus || 0).toFixed(2)} | With: {Number(user.withdrawal || 0).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-green-500 font-bold">
                      {Number(user.total_fees_paid || 0).toFixed(2)} USDT
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-[10px] font-bold uppercase tracking-tight">{format(new Date(user.created_at), 'yyyy-MM-dd')}</div>
                      <div className="text-[9px] text-muted-foreground">{format(new Date(user.created_at), 'HH:mm:ss')}</div>
                      <Badge variant="outline" className="text-[8px] h-4 px-1 mt-1 font-black">
                        {user.signup_method || 'Email'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" onClick={() => handleOpenEdit(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleOpenDocs(user)}>
                          <FileText className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="duration-0 animate-none fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User?</AlertDialogTitle>
                              <AlertDialogDescription>Permanent action. This removes all user data.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-red-500">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent 
          data-testid="edit-user-dialog"
          className="max-w-4xl max-h-[90vh] overflow-y-auto duration-0 animate-none fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]"
        >
          <DialogHeader>
            <DialogTitle data-testid="edit-user-title">Edit User: {selectedUser?.email}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="basic" className="w-full" data-testid="edit-user-tabs">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto min-h-[2.25rem] flex-wrap">
              <TabsTrigger value="basic" data-testid="tab-basic-info">Basic Info</TabsTrigger>
              <TabsTrigger value="wallets" data-testid="tab-wallets">Wallets</TabsTrigger>
              <TabsTrigger value="roi" data-testid="tab-roi">ROI Info</TabsTrigger>
              <TabsTrigger value="performance" data-testid="tab-performance">Levels & Perf</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4 pt-4" data-testid="content-basic-info">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-full-name">Full Name</Label>
                  <Input id="edit-full-name" data-testid="input-full-name" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input id="edit-email" data-testid="input-email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input value={editForm.state} onChange={e => setEditForm({...editForm, state: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input value={editForm.country} onChange={e => setEditForm({...editForm, country: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Postal Code</Label>
                  <Input value={editForm.postal_code} onChange={e => setEditForm({...editForm, postal_code: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>User Group</Label>
                  <Input value={editForm.user_group} onChange={e => setEditForm({...editForm, user_group: e.target.value})} placeholder="e.g. VIP, standard" />
                </div>
                {isAdmin && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-primary" />
                      Platform Role
                    </Label>
                    <Select 
                      value={editForm.role} 
                      onValueChange={(v: any) => setEditForm({...editForm, role: v})}
                    >
                      <SelectTrigger className="v56-glass-input">
                        <SelectValue placeholder="Select Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="wallets" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Deposit Balance</Label>
                  <Input type="number" value={editForm.deposit_balance} onChange={e => setEditForm({...editForm, deposit_balance: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>ROI Balance</Label>
                  <Input type="number" value={editForm.roi_balance} onChange={e => setEditForm({...editForm, roi_balance: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Bonus Balance</Label>
                  <Input type="number" value={editForm.bonus_balance} onChange={e => setEditForm({...editForm, bonus_balance: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Withdrawal Balance</Label>
                  <Input type="number" value={editForm.withdrawal_balance} onChange={e => setEditForm({...editForm, withdrawal_balance: Number(e.target.value)})} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="roi" className="space-y-6 pt-4">
              <div className="flex justify-between items-center bg-primary/5 p-4 rounded-xl border border-primary/10 mb-4">
                <div className="space-y-1">
                  <h4 className="font-bold text-sm uppercase tracking-wider">Default Configuration</h4>
                  <p className="text-xs text-muted-foreground">Apply standard platform defaults from settings.</p>
                </div>
                <Button variant="outline" size="sm" onClick={applyDefaults} className="gold-border hover:bg-primary/10">
                  <Zap className="h-4 w-4 mr-2 text-primary" />
                  Apply Default Settings
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-bold">Individual Monthly ROI (%)</Label>
                  <Input type="number" step="0.1" value={editForm.monthly_roi_percentage} onChange={e => setEditForm({...editForm, monthly_roi_percentage: Number(e.target.value)})} />
                  <p className="text-[10px] text-muted-foreground italic">Overrides platform default for this specific user.</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold">Target USDT (Wealth Projection)</Label>
                  <Input type="number" value={editForm.target_usdt} onChange={e => setEditForm({...editForm, target_usdt: Number(e.target.value)})} />
                  <p className="text-[10px] text-muted-foreground italic">Target amount used in this user's wealth projection hub.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-px bg-white/5 flex-1" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Individual Level Commission Overrides</span>
                  <div className="h-px bg-white/5 flex-1" />
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {Array.from({ length: 15 }, (_, i) => i + 1).map((lvl) => {
                    const key = `level${lvl}_commission`;
                    const isOverridden = editForm.referral_levels_overrides[key] !== undefined;
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
                          value={editForm.referral_levels_overrides[key] ?? ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? undefined : Number(e.target.value);
                            const updatedOverrides = { ...editForm.referral_levels_overrides };
                            if (val === undefined) {
                              delete updatedOverrides[key];
                            } else {
                              updatedOverrides[key] = val;
                            }
                            setEditForm({ ...editForm, referral_levels_overrides: updatedOverrides });
                          }}
                          className="h-7 text-xs"
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-center text-muted-foreground opacity-60 mt-2 italic">
                  Empty fields will inherit values from the platform-wide configuration.
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <div className="h-px bg-white/5 flex-1" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Individual Level Unlock Targets (USDT)</span>
                  <div className="h-px bg-white/5 flex-1" />
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {Array.from({ length: 11 }, (_, i) => i + 5).map((lvl) => {
                    const key = `level${lvl}_target`;
                    const defaultTarget = [0,0,0,0,10000, 25000, 50000, 100000, 200000, 400000, 800000, 1600000, 3200000, 6400000, 12800000][lvl-1];
                    return (
                      <div key={lvl} className={`space-y-1 p-2 rounded-lg border ${editForm.referral_level_targets[key] !== undefined ? 'bg-primary/5 border-primary/20' : 'bg-white/5 border-white/5'}`}>
                        <div className="flex justify-between items-center mb-1">
                          <Label className="text-[10px] font-bold">L{lvl} Target</Label>
                        </div>
                        <Input
                          type="number"
                          placeholder={defaultTarget.toString()}
                          value={editForm.referral_level_targets[key] ?? ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? undefined : Number(e.target.value);
                            const updatedTargets = { ...editForm.referral_level_targets };
                            if (val === undefined) {
                              delete updatedTargets[key];
                            } else {
                              updatedTargets[key] = val;
                            }
                            setEditForm({ ...editForm, referral_level_targets: updatedTargets });
                          }}
                          className="h-7 text-xs"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4 pt-4">
               <div className="p-4 bg-accent/20 rounded-lg">
                  <Label className="text-primary font-bold">Direct Referral Performance: {selectedUser?.performance_usdt || 0} USDT</Label>
               </div>
               <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(lvl => (
                    <div key={lvl} className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id={`lvl-${lvl}`} 
                        checked={(editForm as any)[`referral_level_${lvl}_enabled`]}
                        onChange={e => setEditForm({...editForm, [`referral_level_${lvl}_enabled`]: e.target.checked})}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Label htmlFor={`lvl-${lvl}`} className="text-sm">Enable Level {lvl}</Label>
                    </div>
                  ))}
               </div>
            </TabsContent>
          </Tabs>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} data-testid="edit-user-cancel">Cancel</Button>
            <Button onClick={handleUpdateUser} data-testid="edit-user-save">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent 
          data-testid="create-user-dialog"
          className="duration-0 animate-none fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]"
        >
          <DialogHeader>
            <DialogTitle data-testid="create-user-title">Create New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-user-name">Full Name</Label>
              <Input id="new-user-name" data-testid="new-user-name" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-email">Email</Label>
              <Input id="new-user-email" data-testid="new-user-email" type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-password">Password</Label>
              <Input id="new-user-password" data-testid="new-user-password" type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Platform Role</Label>
              <Select 
                value={newUser.role} 
                onValueChange={(v: any) => setNewUser({...newUser, role: v})}
              >
                <SelectTrigger className="v56-glass-input">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreateUser} data-testid="create-user-submit" className="w-full ">Create User</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* KYC Docs Dialog */}
      <Dialog open={kycDocsDialogOpen} onOpenChange={setKycDocsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto duration-0 animate-none fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]">
          <DialogHeader>
            <DialogTitle>KYC Documents Verification: {selectedUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-accent/30 p-4 rounded-lg border border-primary/20">
              <div>
                <span className="font-bold text-lg">Current Status: </span>
                <span className={`font-bold text-lg ${
                  selectedUser?.kyc_status === 'approved' ? 'text-green-500' :
                  selectedUser?.kyc_status === 'rejected' ? 'text-red-500' :
                  'text-yellow-500'
                }`}>
                  {selectedUser?.kyc_status?.toUpperCase()}
                </span>
              </div>
              <div className="flex gap-2">
                 <Button size="sm" onClick={() => handleUpdateKycStatus('approved')} className="bg-green-600 hover:bg-green-700">
                   Approve KYC
                 </Button>
                 <Button size="sm" variant="destructive" onClick={() => handleUpdateKycStatus('rejected')}>
                   Reject KYC
                 </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {userDocs.length === 0 ? (
                <div className="text-center py-10 bg-accent/20 rounded-lg border border-dashed border-border">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground font-semibold">No documents uploaded yet</p>
                  <p className="text-xs text-muted-foreground mt-1">User needs to upload KYC documents from their profile page</p>
                </div>
              ) : userDocs.map(doc => (
                <div key={doc.id} className="border border-primary/20 rounded-lg overflow-hidden bg-accent/10">
                  <div className="flex justify-between items-center p-4 bg-accent/30 border-b border-border">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-bold">{doc.document_type}</p>
                        <p className="text-xs text-muted-foreground">Uploaded document</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => window.open(doc.file_url, '_blank')}
                        className="gap-2"
                      >
                        <FileText className="h-3 w-3" />
                        View Full Size
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleDeleteDoc(doc.id)} 
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Document Preview */}
                  <div className="p-4">
                    <div className="relative rounded-lg overflow-hidden border border-border bg-black/20">
                      <img 
                        src={doc.file_url} 
                        alt={doc.document_type}
                        className="w-full h-auto max-h-[400px] object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder-document.png';
                        }}
                      />
                    </div>
                    
                    {/* OCR Text Display (only for ID Front) */}
                    {doc.ocr_text && (
                      <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <p className="text-xs font-bold text-primary mb-2 flex items-center gap-2">
                          <ShieldAlert className="h-3 w-3" />
                          AI-Extracted Information
                        </p>
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                          {doc.ocr_text}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
