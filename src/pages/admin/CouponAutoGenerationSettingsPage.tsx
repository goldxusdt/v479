import { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  RefreshCw, 
  ArrowLeft,
  Target,
  Trophy,
  Zap,
  Percent,
  Coins,
  Ticket
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/services/supabase';

interface GenerationRule {
  id?: string;
  type: 'tier' | 'performance';
  name: string;
  threshold: number;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  validity_days: number;
  transaction_type: 'deposit' | 'withdrawal' | 'all';
  is_enabled: boolean;
}

export default function CouponAutoGenerationSettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<GenerationRule[]>([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('coupon_auto_generation_settings')
        .select('*')
        .order('threshold', { ascending: true });

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = (type: 'tier' | 'performance') => {
    const newRule: GenerationRule = {
      type,
      name: type === 'tier' ? 'New Tier' : 'New Milestone',
      threshold: 0,
      discount_type: 'percentage',
      discount_value: 10,
      validity_days: 7,
      transaction_type: 'all',
      is_enabled: true
    };
    setRules([...rules, newRule]);
  };

  const handleUpdateRule = (index: number, updates: Partial<GenerationRule>) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], ...updates };
    setRules(newRules);
  };

  const handleDeleteRule = async (index: number) => {
    const ruleToDelete = rules[index];
    if (ruleToDelete.id) {
      const { error } = await supabase
        .from('coupon_auto_generation_settings')
        .delete()
        .eq('id', ruleToDelete.id);
      
      if (error) {
        toast.error('Failed to delete rule from database');
        return;
      }
    }
    const newRules = rules.filter((_, i) => i !== index);
    setRules(newRules);
    toast.success('Rule removed');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const rule of rules) {
        if (rule.id) {
          await (supabase
            .from('coupon_auto_generation_settings') as any)
            .update(rule)
            .eq('id', rule.id);
        } else {
          await (supabase
            .from('coupon_auto_generation_settings') as any)
            .insert(rule);
        }
      }
      toast.success('Settings saved successfully');
      loadSettings();
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleRunAutoGen = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-generate-coupons');
      if (error) throw error;
      toast.success(`Generated ${data?.generatedCount ?? 0} coupons`);
    } catch (error) {
      console.error('Auto-gen failed:', error);
      toast.error('Auto-generation failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessCoupons = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-coupons');
      if (error) throw error;
      toast.success(`Processed: ${data.expired} expired, ${data.activated} activated`);
    } catch (error) {
      console.error('Process failed:', error);
      toast.error('Coupon processing failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/coupons')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold v56-gradient-text">Auto-Generation Settings</h1>
            <p className="text-muted-foreground">Configure automated coupon rewards for users</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleProcessCoupons} disabled={processing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${processing ? 'animate-spin' : ''}`} />
            Cleanup Expired
          </Button>
          <Button variant="secondary" onClick={handleRunAutoGen} disabled={processing}>
            <Ticket className="h-4 w-4 mr-2" />
            Run Auto-Gen
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="tier" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="tier" className="gap-2">
            <Trophy className="h-4 w-4" />
            Tier-Based
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2">
            <Zap className="h-4 w-4" />
            Performance-Based
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tier" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Investment Tiers</h2>
              <p className="text-sm text-muted-foreground">Coupons generated when user reaches investment milestones</p>
            </div>
            <Button onClick={() => handleAddRule('tier')} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Tier
            </Button>
          </div>

          <div className="grid gap-4">
            {rules.filter(r => r.type === 'tier').map((rule, idx) => (
              <RuleCard 
                key={idx} 
                rule={rule} 
                onUpdate={(upd) => handleUpdateRule(rules.indexOf(rule), upd)}
                onDelete={() => handleDeleteRule(rules.indexOf(rule))}
              />
            ))}
            {rules.filter(r => r.type === 'tier').length === 0 && (
              <Card className="v56-glass border-dashed py-12 text-center text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No tier-based rules configured yet.</p>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Referral Milestones</h2>
              <p className="text-sm text-muted-foreground">Coupons generated based on number of active referrals</p>
            </div>
            <Button onClick={() => handleAddRule('performance')} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Milestone
            </Button>
          </div>

          <div className="grid gap-4">
            {rules.filter(r => r.type === 'performance').map((rule, idx) => (
              <RuleCard 
                key={idx} 
                rule={rule} 
                onUpdate={(upd) => handleUpdateRule(rules.indexOf(rule), upd)}
                onDelete={() => handleDeleteRule(rules.indexOf(rule))}
              />
            ))}
            {rules.filter(r => r.type === 'performance').length === 0 && (
              <Card className="v56-glass border-dashed py-12 text-center text-muted-foreground">
                <Zap className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No performance-based rules configured yet.</p>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RuleCard({ rule, onUpdate, onDelete }: { rule: GenerationRule, onUpdate: (u: Partial<GenerationRule>) => void, onDelete: () => void }) {
  return (
    <Card className="v56-glass premium-border overflow-hidden">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${rule.type === 'tier' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
            {rule.type === 'tier' ? <Trophy className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
          </div>
          <div>
            <CardTitle className="text-lg">
              <Input 
                value={rule.name} 
                onChange={e => onUpdate({ name: e.target.value })}
                className="h-7 border-none bg-transparent p-0 font-bold focus-visible:ring-0"
              />
            </CardTitle>
            <CardDescription>
              Threshold: {rule.type === 'tier' ? `${rule.threshold} USDT Invested` : `${rule.threshold} Active Referrals`}
            </CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch 
              checked={rule.is_enabled} 
              onCheckedChange={enabled => onUpdate({ is_enabled: enabled })}
            />
            <Label className="text-xs uppercase font-bold tracking-tighter">Enabled</Label>
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <Label className="text-xs">Threshold Value</Label>
            <div className="relative">
              {rule.type === 'tier' ? <Coins className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /> : <Plus className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />}
              <Input 
                type="number" 
                value={rule.threshold} 
                onChange={e => onUpdate({ threshold: parseFloat(e.target.value) })}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs">Discount Type</Label>
            <Select value={rule.discount_type} onValueChange={(val: any) => onUpdate({ discount_type: val })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
                <SelectItem value="fixed">Fixed (USDT)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Discount Value</Label>
            <div className="relative">
              {rule.discount_type === 'percentage' ? <Percent className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /> : <Coins className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />}
              <Input 
                type="number" 
                value={rule.discount_value} 
                onChange={e => onUpdate({ discount_value: parseFloat(e.target.value) })}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Validity (Days)</Label>
            <Input 
              type="number" 
              value={rule.validity_days} 
              onChange={e => onUpdate({ validity_days: parseInt(e.target.value) })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
