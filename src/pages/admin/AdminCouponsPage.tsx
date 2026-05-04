import { Plus, Trash, Ticket, AlertCircle, Coins, ArrowUpCircle, ArrowDownCircle, Layers, CheckCircle2, BarChart3, Users, History, Settings, Eraser, Loader2, Edit } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from '@/services/supabase';
import type { Coupon } from '@/types';
import { exportToCSV } from '@/utils/csv-export';

export default function AdminCouponsPage() {
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Preview State
  const [previewAmount, setPreviewAmount] = useState<string>('1000');

  const [newCoupon, setNewCoupon] = useState<{
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    description: string;
    usage_limit: number;
    expiry_date: string;
    valid_from: string;
    campaign_start_at: string;
    campaign_end_at: string;
    auto_activate: boolean;
    auto_deactivate: boolean;
    redemption_type: 'deposit' | 'withdrawal' | 'all';
    applicable_plans: string[];
    single_use_per_user: boolean;
  }>({
    code: '',
    discount_type: 'percentage',
    discount_value: 0,
    description: '',
    usage_limit: 100,
    expiry_date: '',
    valid_from: '',
    campaign_start_at: '',
    campaign_end_at: '',
    auto_activate: true,
    auto_deactivate: true,
    redemption_type: 'all',
    applicable_plans: [],
    single_use_per_user: true,
  });

  const [bulkConfig, setBulkConfig] = useState({
    count: 10,
    prefix: 'GOLD',
    length: 10,
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 10,
    redemption_type: 'all' as 'deposit' | 'withdrawal' | 'all',
    applicable_plans: [] as string[],
    usage_limit: 1,
    single_use_per_user: true,
  });

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (error) {
      console.error('Failed to load coupons:', error);
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const previewResult = useMemo(() => {
    const amount = parseFloat(previewAmount) || 0;
    const feePercentage = 5; // Default or fetched from plan
    const originalFee = amount * (feePercentage / 100);
    
    let discount = 0;
    if (newCoupon.discount_type === 'percentage') {
      discount = originalFee * (newCoupon.discount_value / 100);
    } else {
      discount = newCoupon.discount_value;
    }
    
    const finalFee = Math.max(0, originalFee - discount);
    const savings = originalFee - finalFee;
    const effectiveRate = originalFee > 0 ? (savings / originalFee) * 100 : 0;
    
    return {
      originalFee,
      discount,
      finalFee,
      savings,
      effectiveRate
    };
  }, [previewAmount, newCoupon.discount_type, newCoupon.discount_value]);

  const generateRandomCode = (prefix: string, length: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = prefix;
    for (let i = 0; i < length - prefix.length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleBulkGenerate = async () => {
    setGenerating(true);
    try {
      const newCoupons = [];
      const usedCodes = new Set(coupons.map(c => c.code));

      for (let i = 0; i < bulkConfig.count; i++) {
        let code;
        let attempts = 0;
        do {
          code = generateRandomCode(bulkConfig.prefix, bulkConfig.length);
          attempts++;
        } while (usedCodes.has(code) && attempts < 100);

        if (attempts >= 100) {
          throw new Error('Failed to generate unique codes. Try a different prefix or longer length.');
        }

        usedCodes.add(code);
        newCoupons.push({
          code,
          discount_type: bulkConfig.discount_type,
          discount_value: bulkConfig.discount_value,
          redemption_type: bulkConfig.redemption_type,
          applicable_plans: bulkConfig.applicable_plans,
          usage_limit: bulkConfig.usage_limit,
          single_use_per_user: bulkConfig.single_use_per_user,
          is_active: true
        });
      }

      const { error } = await (supabase.from('coupons') as any).insert(newCoupons);
      if (error) throw error;

      toast.success(`Successfully generated ${bulkConfig.count} coupons`);
      setBulkDialogOpen(false);
      loadCoupons();
      
      // Export to CSV immediately
      exportToCSV(newCoupons.map(c => ({ Code: c.code, Type: c.discount_type, Value: c.discount_value })), 'generated_coupons');
    } catch (error: unknown) {
      console.error('Bulk generation failed:', error);
      toast.error((error as any).message || 'Bulk generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleEditClick = (coupon: Coupon) => {
    setEditingCouponId(coupon.id);
    setNewCoupon({
      code: coupon.code,
      discount_type: coupon.discount_type as any || 'percentage',
      discount_value: Number(coupon.discount_value || coupon.percentage || 0),
      description: coupon.description || '',
      usage_limit: coupon.usage_limit || 100,
      expiry_date: coupon.expiry_date ? format(new Date(coupon.expiry_date), 'yyyy-MM-dd') : '',
      valid_from: coupon.valid_from ? format(new Date(coupon.valid_from), 'yyyy-MM-dd') : '',
      campaign_start_at: (coupon as any).campaign_start_at ? format(new Date((coupon as any).campaign_start_at), 'yyyy-MM-dd') : '',
      campaign_end_at: (coupon as any).campaign_end_at ? format(new Date((coupon as any).campaign_end_at), 'yyyy-MM-dd') : '',
      auto_activate: (coupon as any).auto_activate ?? true,
      auto_deactivate: (coupon as any).auto_deactivate ?? true,
      redemption_type: coupon.redemption_type as any || 'all',
      applicable_plans: coupon.applicable_plans || [],
      single_use_per_user: coupon.single_use_per_user ?? true,
    });
    setCreateDialogOpen(true);
  };

  const handleCreateCoupon = async () => {
    if (!newCoupon.code || newCoupon.discount_value <= 0) {
      toast.error('Please provide a code and discount value');
      return;
    }

    try {
      const couponData: any = {
        code: newCoupon.code.toUpperCase(),
        discount_type: newCoupon.discount_type,
        discount_value: newCoupon.discount_value,
        percentage: newCoupon.discount_type === 'percentage' ? newCoupon.discount_value : 0,
        description: newCoupon.description,
        usage_limit: newCoupon.usage_limit,
        expiry_date: newCoupon.expiry_date || null,
        valid_from: newCoupon.valid_from || null,
        campaign_start_at: newCoupon.campaign_start_at || null,
        campaign_end_at: newCoupon.campaign_end_at || null,
        auto_activate: newCoupon.auto_activate,
        auto_deactivate: newCoupon.auto_deactivate,
        redemption_type: newCoupon.redemption_type,
        applicable_plans: newCoupon.applicable_plans,
        single_use_per_user: newCoupon.single_use_per_user,
      };

      if (editingCouponId) {
        const { error } = await (supabase.from('coupons') as any)
          .update(couponData)
          .eq('id', editingCouponId);
        if (error) throw error;
        toast.success('Coupon updated successfully');
      } else {
        const { error } = await (supabase.from('coupons') as any).insert({
          ...couponData,
          is_active: true
        });
        if (error) throw error;
        toast.success('Coupon created successfully');
      }

      setCreateDialogOpen(false);
      setEditingCouponId(null);
      setNewCoupon({
        code: '',
        discount_type: 'percentage',
        discount_value: 0,
        description: '',
        usage_limit: 100,
        expiry_date: '',
        valid_from: '',
        campaign_start_at: '',
        campaign_end_at: '',
        auto_activate: true,
        auto_deactivate: true,
        redemption_type: 'all',
        applicable_plans: [],
        single_use_per_user: true,
      });
      loadCoupons();
    } catch (error: unknown) {
      console.error('Failed to create coupon:', error);
      toast.error((error as any).message || 'Failed to create coupon');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;

    try {
      const { error } = await (supabase.from('coupons') as any)
        .update({ is_deleted: true, is_active: false })
        .eq('id', id);
      
      if (error) throw error;

      toast.success('Coupon deleted');
      setSelectedIds(prev => prev.filter(i => i !== id));
      loadCoupons();
    } catch (error) {
      console.error('Failed to delete coupon:', error);
      toast.error('Failed to delete coupon');
    }
  };

  const toggleCouponStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await (supabase
        .from('coupons') as any)
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      loadCoupons();
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === coupons.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(coupons.map(c => c.id));
    }
  };

  const handleBulkDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected coupons?`)) return;

    setDeleting(true);
    try {
      const { error } = await (supabase.from('coupons') as any)
        .update({ is_deleted: true, is_active: false })
        .in('id', selectedIds);
      
      if (error) throw error;

      toast.success(`${selectedIds.length} coupons deleted successfully`);
      setSelectedIds([]);
      loadCoupons();
    } catch (error) {
      console.error('Bulk delete failed:', error);
      toast.error('Bulk delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDeleteUsed = async () => {
    if (!confirm('Are you sure you want to bulk delete used coupons that are also inactive, expired, or reached limit?')) return;
    setDeleting(true);
    try {
      const api = await import('@/services/api');
      const { error } = await api.bulkDeleteUsedCoupons();
        
      if (error) throw error;
      toast.success('Eligible used coupons bulk deleted');
      loadCoupons();
    } catch (error: unknown) {
      console.error('Bulk delete failed:', error);
      toast.error('Bulk delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDeleteExpired = async () => {
    if (!confirm('Are you sure you want to bulk delete ALL expired coupons?')) return;
    setDeleting(true);
    try {
      const api = await import('@/services/api');
      const { error } = await api.bulkDeleteExpiredCoupons();

      if (error) throw error;
      toast.success('Expired coupons bulk deleted');
      loadCoupons();
    } catch (error) {
      console.error('Bulk delete failed:', error);
      toast.error('Bulk delete failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold v56-gradient-text">Coupon Management</h1>
          <p className="text-muted-foreground">Create and manage deposit offers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => navigate('/admin/coupons/analytics')}>
            <BarChart3 className="h-4 w-4" />
            Analytics
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => navigate('/admin/coupons/history')}>
            <History className="h-4 w-4" />
            History
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => navigate('/admin/coupons/auto-gen')}>
            <Settings className="h-4 w-4" />
            Auto-Gen
          </Button>
          <Button variant="outline" className="gap-2 text-destructive hover:bg-destructive/10" onClick={handleBulkDeleteUsed} disabled={deleting}>
            <Eraser className="h-4 w-4" />
            Clear Used
          </Button>
          <Button variant="outline" className="gap-2 text-destructive hover:bg-destructive/10" onClick={handleBulkDeleteExpired} disabled={deleting}>
            <Trash className="h-4 w-4" />
            Clear Expired
          </Button>
          {selectedIds.length > 0 && (
            <Button variant="destructive" className="gap-2 animate-in zoom-in-95 duration-200" onClick={handleBulkDeleteSelected} disabled={deleting}>
              <Eraser className="h-4 w-4" />
              Delete Selected ({selectedIds.length})
            </Button>
          )}
          <Button variant="outline" className="gap-2" onClick={selectAll}>
            {selectedIds.length === coupons.length && coupons.length > 0 ? 'Deselect All' : 'Select All'}
          </Button>
          <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Layers className="h-4 w-4" />
                Bulk Generate
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Bulk Generate Coupons</DialogTitle>
                <DialogDescription>Create multiple unique coupon codes at once.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Count</Label>
                    <Input 
                      type="number" 
                      value={bulkConfig.count} 
                      onChange={e => setBulkConfig({...bulkConfig, count: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Prefix</Label>
                    <Input 
                      value={bulkConfig.prefix} 
                      onChange={e => setBulkConfig({...bulkConfig, prefix: e.target.value.toUpperCase()})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Discount Type</Label>
                    <Select value={bulkConfig.discount_type} onValueChange={(val: any) => setBulkConfig({...bulkConfig, discount_type: val})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed (USDT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Value</Label>
                    <Input 
                      type="number" 
                      value={bulkConfig.discount_value} 
                      onChange={e => setBulkConfig({...bulkConfig, discount_value: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleBulkGenerate} disabled={generating} className="w-full">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Layers className="h-4 w-4 mr-2" />}
                  Generate & Export CSV
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={() => {
            setEditingCouponId(null);
            setNewCoupon({
              code: '',
              discount_type: 'percentage',
              discount_value: 0,
              description: '',
              usage_limit: 100,
              expiry_date: '',
              valid_from: '',
              campaign_start_at: '',
              campaign_end_at: '',
              auto_activate: true,
              auto_deactivate: true,
              redemption_type: 'all',
              applicable_plans: [],
              single_use_per_user: true,
            });
            setCreateDialogOpen(true);
          }} className=" gap-2">
            <Plus className="h-4 w-4" />
            Create Coupon
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingCouponId ? 'Edit Coupon' : 'Create New Coupon'}</DialogTitle>
                <DialogDescription>{editingCouponId ? 'Modify existing coupon settings.' : 'Setup a new deposit incentive for users.'}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="code">Coupon Code</Label>
                    <Input id="code" value={newCoupon.code} onChange={e => setNewCoupon({...newCoupon, code: e.target.value})} placeholder="SUMMER2026" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Redemption Type</Label>
                    <Select value={newCoupon.redemption_type} onValueChange={(val: any) => setNewCoupon({...newCoupon, redemption_type: val})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="deposit">Deposits Only</SelectItem>
                        <SelectItem value="withdrawal">Withdrawals Only</SelectItem>
                        <SelectItem value="all">Global (All)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Discount Type</Label>
                    <RadioGroup value={newCoupon.discount_type} onValueChange={(val: any) => setNewCoupon({...newCoupon, discount_type: val})} className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="percentage" id="perc" />
                        <Label htmlFor="perc">Percentage</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="fixed" id="fix" />
                        <Label htmlFor="fix">Fixed Amount</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="val">Discount Value ({newCoupon.discount_type === 'percentage' ? '%' : 'USDT'})</Label>
                    <Input id="val" type="number" value={newCoupon.discount_value} onChange={e => setNewCoupon({...newCoupon, discount_value: parseFloat(e.target.value)})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="limit">Total Usage Limit</Label>
                    <Input id="limit" type="number" value={newCoupon.usage_limit} onChange={e => setNewCoupon({...newCoupon, usage_limit: parseInt(e.target.value)})} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input id="expiry" type="date" value={newCoupon.expiry_date} onChange={e => setNewCoupon({...newCoupon, expiry_date: e.target.value})} />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="per-user" checked={newCoupon.single_use_per_user} onCheckedChange={(val) => setNewCoupon({...newCoupon, single_use_per_user: val})} />
                  <Label htmlFor="per-user">Single use per user</Label>
                </div>

                {/* Preview Section */}
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-[10px] uppercase font-bold tracking-widest text-primary">Live Calculation Preview</Label>
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] uppercase font-bold">Test Amount:</Label>
                      <Input className="h-6 w-20 text-[10px] font-mono" type="number" value={previewAmount} onChange={e => setPreviewAmount(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center">
                      <p className="text-[9px] uppercase text-muted-foreground">Org Fee</p>
                      <p className="text-sm font-bold text-muted-foreground">${previewResult.originalFee.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] uppercase text-muted-foreground">Discount</p>
                      <p className="text-sm font-bold text-primary">-${previewResult.discount.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] uppercase text-muted-foreground">Final Fee</p>
                      <p className="text-sm font-bold text-green-500">${previewResult.finalFee.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] uppercase text-muted-foreground">Effective %</p>
                      <p className="text-sm font-bold text-orange-500">{previewResult.effectiveRate.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateCoupon} className=" w-full">{editingCouponId ? 'Update Coupon' : 'Create Advanced Coupon'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p>Loading coupons...</p>
        ) : coupons.length === 0 ? (
          <Card className="col-span-full py-12 text-center text-muted-foreground">
            <Ticket className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No coupons found. Create your first offer!</p>
          </Card>
        ) : (
          coupons.map((coupon) => {
            const isExpired = coupon.expiry_date && new Date(coupon.expiry_date) < new Date();
            const isLimitReached = coupon.used_count >= coupon.usage_limit;
            
            return (
              <Card key={coupon.id} className={`v56-glass premium-border relative overflow-hidden group transition-all duration-300 ${selectedIds.includes(coupon.id) ? 'border-primary shadow-glow-sm scale-[1.01]' : ''}`}>
                <div className="absolute top-3 left-3 z-10">
                  <Checkbox 
                    checked={selectedIds.includes(coupon.id)} 
                    onCheckedChange={() => toggleSelection(coupon.id)}
                    className="border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </div>
                <div className="absolute top-0 right-0 p-2 flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => handleEditClick(coupon)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => handleDeleteCoupon(coupon.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Ticket className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-bold text-lg tracking-wider text-primary">{coupon.code}</span>
                  </div>
                  <CardTitle className="text-2xl font-bold">
                    {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `${coupon.discount_value} USDT`} Off
                  </CardTitle>
                  <CardDescription>{coupon.description || 'Limited time offer'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2 p-2 rounded bg-accent/30 border border-white/5">
                      {coupon.redemption_type === 'deposit' ? <ArrowDownCircle className="h-3 w-3 text-blue-500" /> : 
                       coupon.redemption_type === 'withdrawal' ? <ArrowUpCircle className="h-3 w-3 text-orange-500" /> : 
                       <CheckCircle2 className="h-3 w-3 text-green-500" />}
                      <span className="capitalize">{coupon.redemption_type}s</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded bg-accent/30 border border-white/5">
                      <Coins className="h-3 w-3 text-green-500" />
                      <span>${(coupon as any).total_savings?.toFixed(2) || '0.00'} Saved</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2 p-2 rounded bg-accent/30 border border-white/5">
                      <Layers className="h-3 w-3 text-purple-500" />
                      <span>{coupon.applicable_plans?.length > 0 ? `${coupon.applicable_plans.length} Plans` : 'All Plans'}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded bg-accent/30 border border-white/5">
                      <Users className="h-3 w-3 text-blue-400" />
                      <span>{coupon.used_count} Redemptions</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-lg bg-accent/50 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs uppercase font-bold tracking-tighter">Usage</p>
                      <p className="font-mono text-primary flex items-center gap-1">
                        <span className="font-black">{coupon.used_count}</span>
                        <span className="opacity-30 text-[8px] font-sans">OF</span>
                        <span className="font-black">{coupon.usage_limit || '∞'}</span>
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-muted-foreground text-xs uppercase font-bold tracking-tighter">Expiry</p>
                      <p className={isExpired ? 'text-destructive font-bold' : 'font-mono'}>
                        {coupon.expiry_date ? new Date(coupon.expiry_date).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                  </div>

                  {coupon.single_use_per_user && (
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-white/5 p-1 rounded">
                      <CheckCircle2 className="h-2 w-2" />
                      <span>Single use per user enforced</span>
                    </div>
                  )}

                  { (isExpired || isLimitReached) && (
                    <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
                      <AlertCircle className="h-3 w-3" />
                      <span>{isExpired ? 'Expired' : 'Usage limit reached'}</span>
                    </div>
                  ) }

                  <div className="flex items-center justify-between pt-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${coupon.is_auto_deleted ? 'bg-red-500/20 text-red-500' : coupon.is_active ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'}`}>
                      {coupon.is_auto_deleted ? 'Auto-Deleted' : coupon.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {coupon.is_auto_deleted && (
                      <span className="text-[10px] text-destructive italic block mt-1">Reason: {coupon.deletion_reason || 'Expired'}</span>
                    )}
                    {!coupon.is_auto_deleted && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => toggleCouponStatus(coupon.id, coupon.is_active)}
                      >
                        {coupon.is_active ? 'Disable' : 'Enable'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
