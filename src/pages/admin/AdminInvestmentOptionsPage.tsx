import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Users, Tag, Lock, Unlock, AlertCircle, ShieldCheck, RefreshCw, Calendar as CalendarIcon, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/services/supabase';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InvestmentOption } from '@/types';
import { cn } from '@/utils/utils';
import { format, differenceInDays, differenceInHours } from 'date-fns';

export default function AdminInvestmentOptionsPage() {
  const { user } = useAuth();
  const [options, setOptions] = useState<InvestmentOption[]>([]);
  const [filteredOptions, setFilteredOptions] = useState<InvestmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<InvestmentOption | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isLiveRefresh, setIsLiveRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const [formData, setFormData] = useState({
    option_name: '',
    description: '',
    min_amount: 50,
    max_amount: 1000000,
    roi_percentage: 10,
    duration_days: 30,
    duration_hours: 0,
    is_indefinite: false,
    deposit_fee_percentage: 0,
    coupon_code: '',
    roi_payout_frequency: 'daily',
    target_users: 'all' as 'all' | 'specific',
    is_active: true,
    is_visible: true,
    auto_refund_duration_days: 0,
    expires_at: '',
  });

  const calculateDurationFromExpiry = (expiryDate: string) => {
    if (!expiryDate) return;
    
    const expiry = new Date(expiryDate);
    const now = new Date();
    
    if (expiry <= now) {
      toast.error('Expiration date must be in the future');
      return;
    }
    
    const days = differenceInDays(expiry, now);
    const hours = differenceInHours(expiry, now) % 24;
    
    setFormData(prev => ({
      ...prev,
      duration_days: days,
      duration_hours: hours,
      is_indefinite: false
    }));
  };

  const loadOptions = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const { data, error } = await supabase
      .from('investment_options')
      .select('*')
      .order('is_locked', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load investment options');
      console.error(error);
    } else {
      setOptions(data || []);
      setLastRefresh(new Date());
    }
    if (showLoading) setLoading(false);
  }, []);

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name');
    setAllUsers(data || []);
  };

  useEffect(() => {
    loadOptions();
    loadUsers();

    let interval: NodeJS.Timeout;
    if (isLiveRefresh) {
      interval = setInterval(() => {
        loadOptions(false);
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loadOptions, isLiveRefresh]);
  useEffect(() => {
    filterOptions();
  }, [options, statusFilter, searchQuery]);


  const filterOptions = () => {
    let filtered = [...options];

    if (statusFilter === 'active') {
      filtered = filtered.filter((opt) => opt.is_active);
    } else if (statusFilter === 'archived') {
      filtered = filtered.filter((opt) => !opt.is_active);
    }

    if (searchQuery) {
      filtered = filtered.filter((opt) => 
        opt.option_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredOptions(filtered);
  };

  const handleCreate = () => {
    setEditingOption(null);
    setFormData({
      option_name: '',
      description: '',
      min_amount: 50,
      max_amount: 1000000,
      roi_percentage: 10,
      duration_days: 30,
      duration_hours: 0,
      is_indefinite: false,
      deposit_fee_percentage: 0,
      coupon_code: '',
      roi_payout_frequency: 'daily',
      target_users: 'all',
      is_active: true,
      is_visible: true,
      auto_refund_duration_days: 0,
      expires_at: '',
    });
    setSelectedUserIds([]);
    setDialogOpen(true);
  };

  const handleEdit = (option: InvestmentOption) => {
    setEditingOption(option);
    setFormData({
      option_name: option.option_name,
      description: option.description || '',
      min_amount: option.min_amount,
      max_amount: option.max_amount,
      roi_percentage: option.roi_percentage,
      duration_days: option.duration_days,
      duration_hours: option.duration_hours,
      is_indefinite: option.duration_days === 0 && option.duration_hours === 0,
      deposit_fee_percentage: option.deposit_fee_percentage || 0,
      coupon_code: option.coupon_code || '',
      roi_payout_frequency: option.roi_payout_frequency || 'daily',
      target_users: (option as any).target_users || 'all',
      is_active: option.is_active,
      is_visible: option.is_visible,
      auto_refund_duration_days: (option as any).auto_refund_duration_days || 0,
      expires_at: (option as any).expires_at ? format(new Date((option as any).expires_at), 'yyyy-MM-dd') : '',
    });
    setSelectedUserIds((option as any).specific_user_ids || []);
    setDialogOpen(true);
  };

  const handleToggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSave = async () => {
    if (!formData.option_name.trim()) {
      toast.error('Option name is required');
      return;
    }

    if (formData.target_users === 'specific' && selectedUserIds.length === 0) {
      toast.error('Please select at least one user for specific targeting');
      return;
    }

    try {
      const saveData: any = {
        option_name: formData.option_name,
        description: formData.description,
        min_amount: formData.min_amount,
        max_amount: formData.max_amount,
        interest_rate: formData.roi_percentage, // Keep both in sync
        roi_percentage: formData.roi_percentage,
        duration_days: formData.is_indefinite ? 0 : formData.duration_days,
        duration_hours: formData.is_indefinite ? 0 : formData.duration_hours,
        deposit_fee_percentage: formData.deposit_fee_percentage,
        coupon_code: formData.coupon_code || null,
        roi_payout_frequency: formData.roi_payout_frequency,
        target_users: formData.target_users,
        specific_user_ids: formData.target_users === 'specific' ? selectedUserIds : [],
        is_active: formData.is_active,
        is_visible: formData.is_visible,
        auto_refund_duration_days: formData.auto_refund_duration_days,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      if (editingOption) {
        const { error } = await (supabase
          .from('investment_options') as any)
          .update(saveData as any)
          .eq('id', editingOption.id);
        
        if (error) throw error;
        toast.success('Investment option updated successfully');
      } else {
        // Create new option
        saveData.created_by = user?.id;
        const { error } = await (supabase
          .from('investment_options') as any)
          .insert([saveData] as any);

        if (error) throw error;
        toast.success('Investment option created successfully');
      }

      setDialogOpen(false);
      loadOptions();
    } catch (error: unknown) {
      toast.error((error as any).message || 'Failed to save investment option');
      console.error(error);
    }
  };

  const handleToggleLock = async (option: InvestmentOption) => {
    try {
      const { error } = await (supabase
        .from('investment_options') as any)
        .update({ is_locked: !option.is_locked } as any)
        .eq('id', option.id);

      if (error) throw error;
      toast.success(`Plan ${option.is_locked ? 'unlocked' : 'locked'} successfully`);
      loadOptions();
    } catch (error: unknown) {
      toast.error((error as any).message || 'Failed to toggle lock status');
      console.error(error);
    }
  };

  const handleToggleActive = async (option: InvestmentOption) => {
    try {
      const { error } = await (supabase
        .from('investment_options') as any)
        .update({ is_active: !option.is_active } as any)
        .eq('id', option.id);

      if (error) throw error;
      toast.success(`Plan ${option.is_active ? 'archived' : 'activated'} successfully`);
      loadOptions();
    } catch (error: unknown) {
      toast.error((error as any).message || 'Failed to update plan active status');
    }
  };

  const handleArchive = async (optionId: string) => {
    try {
      const { error } = await (supabase
        .from('investment_options') as any)
        .update({ is_active: false, is_visible: false } as any)
        .eq('id', optionId);

      if (error) throw error;
      toast.success('Investment option archived successfully');
      loadOptions();
      setDeleteDialogOpen(false);
    } catch (error: unknown) {
      toast.error((error as any).message || 'Failed to archive investment option');
      console.error(error);
    }
  };

  const handleDelete = async (optionId: string) => {
    if (!confirm('Are you sure you want to delete this plan? This will force-complete all active investments in this plan and refund the principal to all participants. This action is irreversible.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('investment_options')
        .delete()
        .eq('id', optionId);

      if (error) {
        throw error;
      }
      toast.success('Investment plan deleted and all participants refunded');
      loadOptions();
      setDeleteDialogOpen(false);
    } catch (error: unknown) {
      toast.error((error as any).message || 'Failed to delete investment plan');
      console.error(error);
    }
  };

  const formatDuration = (days: number, hours: number) => {
    if (days === 0 && hours === 0) return 'Indefinite';
    const parts = [];
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    return parts.join(' ');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black v56-gradient-text tracking-tight uppercase italic">Investment <span className="text-foreground">Management</span></h1>
          <p className="text-muted-foreground text-sm uppercase font-bold tracking-widest opacity-60">
            CRUD interface for premium investment plans & unique wallets
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadOptions()} 
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
          <Button onClick={handleCreate} className="gap-2 premium-gradient h-10 px-6 rounded-xl font-black uppercase tracking-widest text-[10px]">
            <Plus className="h-4 w-4" />
            Create New Plan
          </Button>
        </div>
      </div>

      <div className="text-[10px] uppercase font-bold text-muted-foreground opacity-60">
        Last update: {format(lastRefresh, 'HH:mm:ss')}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between v56-glass p-4 rounded-2xl border border-white/5">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)} className="w-full">
            <TabsList className="bg-black/20 border border-white/5">
              <TabsTrigger value="all" className="uppercase font-bold text-[10px] tracking-widest">All</TabsTrigger>
              <TabsTrigger value="active" className="uppercase font-bold text-[10px] tracking-widest">Active</TabsTrigger>
              <TabsTrigger value="archived" className="uppercase font-bold text-[10px] tracking-widest">Archived</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="relative w-full md:w-64">
          <Input 
            placeholder="Search plans..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-black/20 border-white/10 rounded-xl h-10 pl-10"
          />
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Options List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-20 v56-glass rounded-3xl border border-dashed border-white/10">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground uppercase font-black tracking-widest text-xs">Loading plans...</p>
          </div>
        ) : filteredOptions.length === 0 ? (
          <div className="col-span-full text-center py-20 v56-glass rounded-3xl border border-dashed border-white/10">
            <AlertCircle className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground uppercase font-black tracking-widest text-xs">No plans found matching your criteria</p>
          </div>
        ) : (
          filteredOptions.map((option) => (
            <Card
              key={option.id}
              className={`v56-glass premium-border overflow-hidden group transition-all duration-300 hover:scale-[1.02] ${
                !option.is_active ? 'opacity-50 grayscale' : ''
              }`}
            >
              <CardHeader className="pb-4 border-b border-white/5 relative">
                {option.is_locked && (
                  <div className="absolute top-4 right-4 text-primary animate-pulse">
                    <Lock className="h-4 w-4" />
                  </div>
                )}
                <div className="flex justify-between items-start mb-2">
                  <Badge className={`${option.is_active ? 'bg-primary/20 text-primary border-primary/20' : 'bg-muted text-muted-foreground'} font-black uppercase tracking-widest text-[9px]`}>
                    {option.roi_percentage}% ROI
                  </Badge>
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-40">
                    {option.roi_payout_frequency}
                  </span>
                </div>
                <CardTitle className="text-xl font-black italic tracking-tighter uppercase truncate">{option.option_name}</CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold tracking-widest line-clamp-2 min-h-[2.5rem]">
                  {option.description || 'No description provided.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground mb-1">Duration</p>
                    <p className="text-sm font-bold text-primary truncate">{formatDuration(option.duration_days, option.duration_hours)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground mb-1">Min Amount</p>
                    <p className="text-sm font-bold text-primary truncate">${option.min_amount} USDT</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground mb-1">Fee</p>
                    <p className="text-sm font-bold text-primary truncate">{option.deposit_fee_percentage}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground mb-1">Target</p>
                    <p className="text-sm font-bold text-primary truncate">{(option as any).target_users === 'all' ? 'Everyone' : 'Specific'}</p>
                  </div>
                </div>

                {option.coupon_code && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <Tag className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Coupon: {option.coupon_code}</span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-2 border-t border-white/5 grid grid-cols-2 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-lg font-bold uppercase tracking-widest text-[9px] hover:bg-white/10"
                  onClick={() => handleEdit(option)}
                >
                  <Edit className="h-3 w-3 mr-1.5" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-9 rounded-lg font-bold uppercase tracking-widest text-[9px] ${
                    option.is_locked ? 'text-primary' : 'text-muted-foreground'
                  }`}
                  onClick={() => handleToggleLock(option)}
                >
                  {option.is_locked ? (
                    <>
                      <Lock className="h-3 w-3 mr-1.5" />
                      Locked
                    </>
                  ) : (
                    <>
                      <Unlock className="h-3 w-3 mr-1.5" />
                      Unlock
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-9 rounded-lg font-bold uppercase tracking-widest text-[9px] ${
                    !option.is_active ? 'text-primary' : 'text-muted-foreground'
                  }`}
                  onClick={() => handleToggleActive(option)}
                >
                  {option.is_active ? (
                    <>
                      <Tag className="h-3 w-3 mr-1.5" />
                      Archive
                    </>
                  ) : (
                    <>
                      <Zap className="h-3 w-3 mr-1.5" />
                      Activate
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-lg font-bold uppercase tracking-widest text-[9px] text-red-500 hover:bg-red-500/10 hover:text-red-500"
                  disabled={option.is_locked}
                  onClick={() => {
                    setEditingOption(option);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-3 w-3 mr-1.5" />
                  Remove
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent 
          className="v56-glass max-w-2xl border-white/10 p-0 overflow-hidden rounded-3xl duration-0 animate-none fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]"
          onInteractOutside={(e) => e.preventDefault()}
          data-testid="investment-plan-dialog"
        >
          <DialogHeader className="p-6 border-b border-white/5 bg-primary/5">
            <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase italic" data-testid="dialog-title">
              {editingOption ? 'Edit Investment Plan' : 'Create New Investment Plan'}
            </DialogTitle>
            <DialogDescription className="text-xs uppercase font-bold tracking-widest opacity-60">
              Configure all parameters for your premium investment strategy.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]" data-testid="dialog-scroll-area">
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* General Info */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="plan-name" className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Plan Name</Label>
                    <Input
                      id="plan-name"
                      data-testid="input-plan-name"
                      
                      value={formData.option_name}
                      onChange={(e) => setFormData({ ...formData, option_name: e.target.value })}
                      placeholder="e.g. Gold Tier Alpha"
                      className="h-12 bg-black/20 border-white/10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plan-desc" className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Description</Label>
                    <Textarea
                      id="plan-desc"
                      data-testid="input-plan-desc"
                      
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Enter plan details..."
                      className="min-h-[100px] bg-black/20 border-white/10 rounded-xl resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="auto-refund-duration" className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Auto Refund Duration (Days)</Label>
                      <Input
                        id="auto-refund-duration"
                        type="number"
                        value={formData.auto_refund_duration_days}
                        onChange={(e) => setFormData({ ...formData, auto_refund_duration_days: parseInt(e.target.value) })}
                        className="h-12 bg-black/20 border-white/10 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expires-at" className="text-[10px] uppercase font-black tracking-widest text-muted-foreground flex items-center gap-2">
                        <CalendarIcon className="h-3 w-3 text-primary" />
                        Plan Expiry Date (Auto-Deletes)
                      </Label>
                      <Input
                        id="expires-at"
                        type="date"
                        value={formData.expires_at}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData({ ...formData, expires_at: val });
                          calculateDurationFromExpiry(val);
                        }}
                        className="h-12 bg-black/20 border-white/10 rounded-xl"
                      />
                      {formData.expires_at && (
                        <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest mt-1">
                          Calculated Duration: {formData.duration_days} Days, {formData.duration_hours} Hours
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Financials & Duration */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="roi-percentage" className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">ROI Percentage (%)</Label>
                      <Input
                        id="roi-percentage"
                        data-testid="input-roi-percentage"
                        type="number"
                        value={formData.roi_percentage}
                        onChange={(e) => setFormData({ ...formData, roi_percentage: parseFloat(e.target.value) })}
                        className="h-12 bg-black/20 border-white/10 rounded-xl font-bold text-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="roi-frequency" className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Payout Freq.</Label>
                      <Select 
                        value={formData.roi_payout_frequency} 
                        onValueChange={(v) => setFormData({ ...formData, roi_payout_frequency: v })}
                      >
                        <SelectTrigger id="roi-frequency" data-testid="select-roi-frequency" className="h-12 bg-black/20 border-white/10 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="v56-glass border-white/10" data-testid="select-roi-frequency-content">
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="min-invest" className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Min Invest (USDT)</Label>
                      <Input
                        id="min-invest"
                        data-testid="input-min-invest"
                        
                        type="number"
                        value={formData.min_amount}
                        onChange={(e) => setFormData({ ...formData, min_amount: parseFloat(e.target.value) })}
                        className="h-12 bg-black/20 border-white/10 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deposit-fee" className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Deposit Fee (%)</Label>
                      <Input
                        id="deposit-fee"
                        data-testid="input-deposit-fee"
                        
                        type="number"
                        value={formData.deposit_fee_percentage}
                        onChange={(e) => setFormData({ ...formData, deposit_fee_percentage: parseFloat(e.target.value) })}
                        className="h-12 bg-black/20 border-white/10 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="indefinite" className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Duration</Label>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="indefinite" 
                          data-testid="checkbox-indefinite"
                          
                          checked={formData.is_indefinite}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_indefinite: !!checked })}
                        />
                        <label htmlFor="indefinite" className="text-[10px] uppercase font-bold tracking-widest cursor-pointer">Indefinite (No expiry)</label>
                      </div>
                    </div>
                    {!formData.is_indefinite && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="duration-days" className="text-[9px] uppercase font-bold opacity-60">Days</Label>
                          <Input
                            id="duration-days"
                            data-testid="input-duration-days"
                            
                            type="number"
                            value={formData.duration_days}
                            onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) })}
                            className="h-10 bg-black/20 border-white/10 rounded-lg"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="duration-hours" className="text-[9px] uppercase font-bold opacity-60">Hours</Label>
                          <Input
                            id="duration-hours"
                            data-testid="input-duration-hours"
                            
                            type="number"
                            value={formData.duration_hours}
                            onChange={(e) => setFormData({ ...formData, duration_hours: parseInt(e.target.value) })}
                            className="h-10 bg-black/20 border-white/10 rounded-lg"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="coupon-code" className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Promo Coupon Code</Label>
                    <Input
                      id="coupon-code"
                      data-testid="input-coupon-code"
                      
                      value={formData.coupon_code}
                      onChange={(e) => setFormData({ ...formData, coupon_code: e.target.value })}
                      placeholder="e.g. WELCOME50"
                      className="h-12 bg-black/20 border-white/10 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                      <Label htmlFor="is-active" className="text-[10px] uppercase font-black tracking-widest text-muted-foreground cursor-pointer">Active Status</Label>
                      <Switch
                        id="is-active"
                        data-testid="switch-is-active"
                        checked={formData.is_active}
                        onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                      <Label htmlFor="is-visible" className="text-[10px] uppercase font-black tracking-widest text-muted-foreground cursor-pointer">Published</Label>
                      <Switch
                        id="is-visible"
                        data-testid="switch-is-visible"
                        checked={formData.is_visible}
                        onCheckedChange={(v) => setFormData({ ...formData, is_visible: v })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Targeting */}
              <div className="pt-6 border-t border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] uppercase font-black tracking-widest text-primary">Target Audience</h4>
                  <Tabs 
                    value={formData.target_users} 
                    onValueChange={(v) => setFormData({ ...formData, target_users: v as any })}
                    className="h-8"
                    data-testid="tabs-target-audience"
                  >
                    <TabsList className="bg-black/20 h-full border border-white/5">
                      <TabsTrigger value="all" className="text-[9px] px-3 uppercase font-bold" data-testid="tab-all-users">Everyone</TabsTrigger>
                      <TabsTrigger value="specific" className="text-[9px] px-3 uppercase font-bold" data-testid="tab-specific-users">Specific Users</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {formData.target_users === 'specific' && (
                  <div className="p-4 rounded-2xl bg-black/20 border border-white/10" data-testid="specific-users-list">
                    <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground mb-3">Select Eligible Users ({selectedUserIds.length})</p>
                    <ScrollArea className="h-40 pr-4">
                      <div className="space-y-2">
                        {allUsers.map((u) => (
                          <div key={u.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                            <Checkbox 
                              id={`user-${u.id}`}
                              data-testid={`checkbox-user-${u.id}`}
                              checked={selectedUserIds.includes(u.id)}
                              onCheckedChange={() => handleToggleUserSelection(u.id)}
                            />
                            <label htmlFor={`user-${u.id}`} className="text-xs cursor-pointer flex-1">
                              <span className="font-bold block">{u.full_name || u.username || 'Anonymous'}</span>
                              <span className="text-[10px] opacity-40">{u.email}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 border-t border-white/5 bg-black/20">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-xl uppercase font-bold text-xs tracking-widest" data-testid="btn-cancel">Cancel</Button>
            <Button onClick={handleSave} className="premium-gradient rounded-xl px-8 uppercase font-black text-xs tracking-widest h-12" data-testid="btn-save">
              <ShieldCheck className="h-4 w-4 mr-2" />
              {editingOption ? 'Update Plan' : 'Publish Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent 
          className="v56-glass border-white/10 rounded-3xl duration-0 animate-none fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black italic tracking-tighter uppercase italic">Remove Investment Plan?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium opacity-70">
              How would you like to remove <span className="text-primary font-bold">"{editingOption?.option_name}"</span>?
              <br /><br />
              <strong>Archive:</strong> Hides it from users but keeps history.
              <br />
              <strong>Delete:</strong> Permanently removes it (only works if no users have invested).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="rounded-xl border-white/10 bg-white/5 hover:bg-white/10 uppercase font-bold text-xs tracking-widest h-11">Cancel</AlertDialogCancel>
            <Button 
              onClick={() => editingOption && handleArchive(editingOption.id)}
              variant="outline"
              className="rounded-xl border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary uppercase font-black text-xs tracking-widest h-11 px-6"
            >
              Archive Plan
            </Button>
            <AlertDialogAction 
              onClick={() => editingOption && handleDelete(editingOption.id)}
              className="rounded-xl bg-red-500 hover:bg-red-600 text-white uppercase font-black text-xs tracking-widest h-11 px-6"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
