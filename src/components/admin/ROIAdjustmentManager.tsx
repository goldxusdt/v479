import { useState, useEffect } from 'react';
import { TrendingUp, Plus, Trash2, Calendar, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/services/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ROIAdjustmentManager() {
  const [loading, setLoading] = useState(false);
  const [roiAdjustments, setRoiAdjustments] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [newAdjustment, setNewAdjustment] = useState({
    name: '',
    percentage: '',
    start_date: '',
    end_date: '',
    is_active: true,
    target_type: 'all',
    target_value: ''
  });

  useEffect(() => {
    loadROIAdjustments();
    loadAllUsers();
  }, []);

  const loadROIAdjustments = async () => {
    try {
      const { data, error } = await supabase
        .from('roi_adjustments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRoiAdjustments(data || []);
    } catch (e: unknown) {
      toast.error('Failed to load ROI adjustments');
    }
  };

  const loadAllUsers = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('id, email, full_name');
      if (error) throw error;
      setAllUsers(data || []);
    } catch (e: unknown) {
      console.error('Failed to load users');
    }
  };

  const handleAddROIAdjustment = async () => {
    if (!newAdjustment.name || !newAdjustment.percentage) {
      toast.error('Name and percentage are required');
      return;
    }

    try {
      setLoading(true);
      const { error } = await (supabase.from('roi_adjustments') as any).insert([{
        ...newAdjustment,
        percentage: parseFloat(newAdjustment.percentage)
      }]);
      
      if (error) throw error;
      
      toast.success('ROI adjustment added');
      setNewAdjustment({
        name: '',
        percentage: '',
        start_date: '',
        end_date: '',
        is_active: true,
        target_type: 'all',
        target_value: ''
      });
      loadROIAdjustments();
    } catch (e: unknown) {
      toast.error('Failed to add adjustment: ' + (e as any).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteROIAdjustment = async (id: string) => {
    try {
      const { error } = await (supabase.from('roi_adjustments') as any).delete().eq('id', id);
      if (error) throw error;
      toast.success('ROI adjustment deleted');
      loadROIAdjustments();
    } catch (e: unknown) {
      toast.error('Failed to delete adjustment');
    }
  };

  const handleToggleROIAdjustment = async (id: string, active: boolean) => {
    try {
      const { error } = await (supabase.from('roi_adjustments') as any).update({ is_active: active }).eq('id', id);
      if (error) throw error;
      loadROIAdjustments();
    } catch (e: unknown) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="v56-glass premium-border">
        <CardHeader>
          <CardTitle className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            ROI Multipliers & Adjustments
          </CardTitle>
          <CardDescription className="text-[10px] uppercase font-bold tracking-widest opacity-60">
            Create temporary or targeted ROI boosts and modifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase opacity-60">Adjustment Name</Label>
              <Input 
                placeholder="e.g. Holiday Bonus 2024"
                value={newAdjustment.name}
                onChange={(e) => setNewAdjustment({...newAdjustment, name: e.target.value})}
                className="premium-border bg-white/5"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase opacity-60">Percentage Multiplier (%)</Label>
              <Input 
                type="number"
                placeholder="e.g. 150 for 1.5x"
                value={newAdjustment.percentage}
                onChange={(e) => setNewAdjustment({...newAdjustment, percentage: e.target.value})}
                className="premium-border bg-white/5"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase opacity-60">Target Type</Label>
              <Select 
                value={newAdjustment.target_type}
                onValueChange={(val) => setNewAdjustment({...newAdjustment, target_type: val})}
              >
                <SelectTrigger className="premium-border bg-white/5">
                  <SelectValue placeholder="Select target" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="user">Specific User</SelectItem>
                  <SelectItem value="level">User Level</SelectItem>
                  <SelectItem value="investment">Specific Plan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase opacity-60">Target Value</Label>
              {newAdjustment.target_type === 'user' ? (
                <Select 
                  value={newAdjustment.target_value}
                  onValueChange={(val) => setNewAdjustment({...newAdjustment, target_value: val})}
                >
                  <SelectTrigger className="premium-border bg-white/5">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input 
                  placeholder="e.g. 1 for Level 1"
                  value={newAdjustment.target_value}
                  onChange={(e) => setNewAdjustment({...newAdjustment, target_value: e.target.value})}
                  className="premium-border bg-white/5"
                  disabled={newAdjustment.target_type === 'all'}
                />
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase opacity-60">Start Date</Label>
              <Input 
                type="date"
                value={newAdjustment.start_date}
                onChange={(e) => setNewAdjustment({...newAdjustment, start_date: e.target.value})}
                className="premium-border bg-white/5"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase opacity-60">End Date</Label>
              <Input 
                type="date"
                value={newAdjustment.end_date}
                onChange={(e) => setNewAdjustment({...newAdjustment, end_date: e.target.value})}
                className="premium-border bg-white/5"
              />
            </div>
          </div>

          <Button 
            onClick={handleAddROIAdjustment} 
            disabled={loading}
            className="w-full premium-gradient font-black uppercase tracking-widest text-xs h-10 rounded-xl"
          >
            {loading ? <Plus className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Add New Adjustment
          </Button>
        </CardContent>
      </Card>

      <Card className="v56-glass premium-border overflow-hidden">
        <CardHeader className="bg-primary/5 border-b border-white/5">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Active Adjustments
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/5 border-b border-white/5">
                <tr className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">
                  <th className="p-4">Adjustment</th>
                  <th className="p-4">Multiplier</th>
                  <th className="p-4">Target</th>
                  <th className="p-4">Period</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {roiAdjustments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest opacity-40">
                      No adjustments configured
                    </td>
                  </tr>
                ) : (
                  roiAdjustments.map((adj) => (
                    <tr key={adj.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                            <TrendingUp className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-xs">{adj.name}</p>
                            {!adj.is_active && <Badge variant="secondary" className="text-[8px] uppercase">Inactive</Badge>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px] font-black">
                          {adj.percentage}%
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-[10px] font-bold">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {adj.target_type === 'all' ? 'Everyone' : `${adj.target_type}: ${adj.target_value}`}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold">{adj.start_date || 'N/A'}</p>
                          <p className="text-[9px] text-muted-foreground">to {adj.end_date || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <Switch 
                            checked={adj.is_active} 
                            onCheckedChange={(checked) => handleToggleROIAdjustment(adj.id, checked)}
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteROIAdjustment(adj.id)}
                            className="h-8 w-8 text-red-500 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
