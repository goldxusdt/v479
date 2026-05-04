import { Award, Copy, TrendingUp, Users, Target, Shield, Zap, Share2, Star, BarChart3, Network, History, LayoutGrid, ArrowLeft, Lock, LockOpen, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { getReferralCommissions, getReferralStats } from '@/services/api';
import { ReferralTree } from '@/components/common/ReferralTree';
import { NetworkAnalytics } from '@/components/user/NetworkAnalytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ReferralCommission, ReferralStats } from '@/types';
import { cn } from '@/utils/utils';
import { supabase } from '@/services/supabase';

export default function ReferralsPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [commissions, setCommissions] = useState<ReferralCommission[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    const { data } = await supabase.from('settings').select('key, value');
    if (data) {
      const settingsObj: Record<string, string> = {};
      (data as any[]).forEach(s => settingsObj[s.key] = s.value);
      setSettings(settingsObj);
    }
  };

  const loadData = async () => {
    if (!user) return;
    try {
      const [statsData, commissionsData] = await Promise.all([
        getReferralStats(user.id),
        getReferralCommissions(user.id)
      ]);
      if (statsData) setStats(statsData);
      if (commissionsData) setCommissions(commissionsData);
    } catch (error) {
      console.error('Failed to load referral data:', error);
    }
  };

  const getReferralLink = () => {
    if (!profile?.referral_code) return '';
    return `${window.location.origin}/signup?ref=${profile.referral_code}`;
  };

  const copyReferralLink = () => {
    const link = getReferralLink();
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied to clipboard!');
  };

  const levelColors = [
    '#FFD700', '#FFA500', '#FF8C00', '#FF7F50', '#FF6347', 
    '#FF4500', '#FF0000', '#DC143C', '#B22222', '#8B0000',
    '#FF1493', '#C71585', '#800080', '#4B0082', '#00008B'
  ];

  const getLevelPercentage = (level: number) => {
    const key = `level${level}_commission`;
    return settings[key] ? `${settings[key]}%` : '0%';
  };

  const levelTargetAmounts = [
    0, 0, 0, 0,
    10000, 25000, 50000, 75000, 100000, 150000, 200000, 300000, 400000, 500000, 1000000
  ];

  return (
    <div className="p-6 lg:p-10 space-y-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl md:text-4xl font-black tracking-tight leading-tight">
              Network <span className="v56-gradient-text">Expansion</span>
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Build your team and earn multi-level rewards
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <Button 
            onClick={() => navigate('/referrals/advanced')} 
            variant="outline"
            className="v56-glass flex-1 md:flex-none h-12 rounded-xl font-bold uppercase tracking-widest text-xs px-6 border-primary/20 text-primary hover:bg-primary/10"
          >
            <Network className="mr-2 h-4 w-4" />
            Advanced Tree Dashboard
          </Button>
          <Button onClick={copyReferralLink} className="v56-primary-btn flex-1 md:flex-none h-12 rounded-xl font-bold uppercase tracking-widest text-xs px-6 shadow-lg shadow-primary/20">
            <Copy className="mr-2 h-4 w-4" />
            Copy Invite Link
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-8">
        <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
          <TabsList className="inline-flex h-12 items-center justify-start rounded-xl bg-muted/50 p-1 text-muted-foreground w-max sm:w-full sm:grid sm:grid-cols-4 border border-white/5">
            <TabsTrigger value="overview" className="rounded-lg h-10 px-6 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2">
              <LayoutGrid className="h-3 w-3" /> Overview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg h-10 px-6 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2">
              <BarChart3 className="h-3 w-3" /> Network Analytics
            </TabsTrigger>
            <TabsTrigger value="tree" className="rounded-lg h-10 px-6 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2">
              <Network className="h-3 w-3" /> Genealogy Tree
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg h-10 px-6 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2">
              <History className="h-3 w-3" /> Bonus History
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-10">
          {/* Referral Link Card - Re-designed */}
          <Card className="v56-glass premium-border relative overflow-hidden group gold-shimmer">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Share2 size={120} />
            </div>
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row gap-8 items-center">
                <div className="flex-1 space-y-4 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary">
                    <Star className="h-3 w-3 fill-primary" /> Elite Invitation Link
                  </div>
                  <h2 className="text-2xl font-black">Invite Partners, Scale Wealth</h2>
                  <p className="text-muted-foreground text-sm max-w-xl">
                    Share your unique invitation link with your network and automatically earn commissions 
                    from up to 15 levels of deep-tier referrals.
                  </p>
                </div>
                <div className="w-full lg:w-auto space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1 min-w-0 sm:min-w-[300px]">
                      <Input
                        value={getReferralLink()}
                        readOnly
                        className="font-mono text-xs h-12 bg-accent/30 border-white/10 pr-12 rounded-xl"
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-1 top-1 h-10 w-10 hover:bg-primary/20"
                        onClick={copyReferralLink}
                      >
                        <Copy className="h-4 w-4 text-primary" />
                      </Button>
                    </div>
                    <Button onClick={copyReferralLink} className=" h-12 px-8 font-black uppercase tracking-widest rounded-xl">
                      Copy Link
                    </Button>
                  </div>
                  <div className="flex items-center justify-center lg:justify-start gap-4">
                    <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Invitation Code:</p>
                    <code className="px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary font-black font-mono tracking-tighter">
                      {profile?.referral_code || '---'}
                    </code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards - Enhanced */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="v56-glass premium-border group hover:border-primary/40 transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Total Partners</p>
                <Users className="h-5 w-5 text-blue-400 transition-transform group-hover:scale-110" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black tabular-nums">{stats?.totalReferrals || 0}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Across all levels</p>
              </CardContent>
            </Card>

            <Card className="v56-glass premium-border group hover:border-primary/40 transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Performance Fund</p>
                <Zap className="h-5 w-5 text-yellow-400 transition-transform group-hover:scale-110" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black tabular-nums">${Number((profile as any)?.performance_contribution || 0).toFixed(2)}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Direct Performance Profit</p>
              </CardContent>
            </Card>

            <Card className="v56-glass premium-border group hover:border-primary/40 transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Network Bonuses</p>
                <TrendingUp className="h-5 w-5 text-blue-400 transition-transform group-hover:scale-110" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black tabular-nums">${stats?.totalEarnings.toFixed(2) || '0.00'}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Total Commission Earned</p>
              </CardContent>
            </Card>

            <Card className="v56-glass premium-border group hover:border-primary/40 transition-all gold-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <p className="text-[10px] uppercase font-black tracking-widest text-primary">Direct Referrals</p>
                <Award className="h-5 w-5 text-primary transition-transform group-hover:scale-110" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black tabular-nums">{stats?.level1Count || 0}</div>
                <p className="text-[10px] text-muted-foreground mt-1 text-primary/60">Level 1 Active</p>
              </CardContent>
            </Card>
          </div>

          {/* Commission Architecture - Progression System */}
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-xl md:text-2xl font-black flex items-center gap-2">
                  <Target className="h-6 w-6 text-primary" />
                  Network <span className="text-primary">Progression</span>
                </h3>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest opacity-70">Sequential Unlock System (Level 1-15)</p>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-primary/5 border border-primary/20">
                <TrendingUp className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-[8px] uppercase font-black text-muted-foreground">Total Performance</p>
                  <p className="text-sm font-black">${(profile?.performance_usdt || 0).toLocaleString()} USDT</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {Array.from({ length: 15 }).map((_, i) => {
                const level = i + 1;
                const target = levelTargetAmounts[i];
                const performance = profile?.performance_usdt || 0;
                const progress = target > 0 ? Math.min(100, (performance / target) * 100) : 100;
                const isCompleted = progress >= 100;
                
                // Automatically unlock if target is met
                const isEnabled = ((profile as any)?.[`referral_level_${level}_enabled`] ?? (level <= 4)) || isCompleted;
                const isLocked = !isEnabled;
                
                const levelCount = stats?.[`level_${level}_count` as keyof ReferralStats] || 0;
                const levelIncome = stats?.[`level_${level}_commission` as keyof ReferralStats] || 0;

                return (
                  <div
                    key={level}
                    className={cn(
                      "relative p-6 rounded-[2rem] border transition-all duration-500 group overflow-hidden flex flex-col justify-between h-full",
                      isLocked 
                        ? "bg-black/40 border-white/5 opacity-60 grayscale-[0.5] hover:grayscale-0 hover:opacity-100" 
                        : "v56-glass border-primary/20 hover:border-primary/50 shadow-lg hover:shadow-primary/10 hover:scale-[1.02] active:scale-[0.98]"
                    )}
                  >
                    {/* Background decoration */}
                    {!isLocked && (
                      <div className="absolute -top-4 -right-4 w-20 h-20 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all" />
                    )}

                    {/* Status Badge */}
                    <div className="flex justify-between items-start mb-6">
                      <div 
                        className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm border-2 shadow-inner"
                        style={{ 
                          backgroundColor: isLocked ? 'rgba(255,255,255,0.05)' : `${levelColors[i]}15`, 
                          borderColor: isLocked ? 'rgba(255,255,255,0.1)' : `${levelColors[i]}30`,
                          color: isLocked ? '#666' : levelColors[i]
                        }}
                      >
                        L{level}
                      </div>
                      <div className={cn(
                        "p-2 rounded-xl border transition-colors",
                        isLocked ? "bg-black/20 border-white/10" : "bg-green-500/10 border-green-500/20"
                      )}>
                        {isLocked ? (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <LockOpen className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-5 flex-1">
                      <div className="space-y-1">
                        <p className="text-3xl font-black tabular-nums tracking-tighter leading-none">
                          {getLevelPercentage(level)}
                        </p>
                        <p className="text-[9px] uppercase font-black tracking-[0.2em] text-muted-foreground">Commission Rate</p>
                      </div>

                      {/* Progression Logic Visualization */}
                      <div className={cn(
                        "p-4 rounded-[1.5rem] space-y-3",
                        isLocked ? "bg-white/5" : "bg-primary/5 border border-primary/10"
                      )}>
                        <div className="flex justify-between items-center">
                          <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground">Unlock Goal</p>
                          {isCompleted && !isLocked && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                        </div>
                        
                        <p className="text-[11px] font-bold leading-tight">
                          {level <= 4 ? "Base Tier (Active)" : `${target.toLocaleString()} USDT Total`}
                        </p>

                        {target > 0 && (
                          <div className="space-y-2">
                            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                              <div 
                                className={cn(
                                  "h-full transition-all duration-1000 ease-out",
                                  isLocked ? "bg-muted" : "bg-primary shadow-[0_0_10px_rgba(255,215,0,0.5)]"
                                )} 
                                style={{ width: `${progress}%` }} 
                              />
                            </div>
                            <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-widest">
                              <span className={cn(isLocked ? "text-muted-foreground" : "text-primary")}>
                                {Math.round(progress)}%
                              </span>
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-widest",
                                isLocked ? "text-muted-foreground" : "text-green-500"
                              )}>
                                {isLocked ? 'Locked' : 'Unlocked'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1">
                          <p className="text-[8px] uppercase font-black tracking-widest text-muted-foreground">Network</p>
                          <p className="text-sm font-black">{levelCount.toLocaleString()}</p>
                        </div>
                        <div className="space-y-1 text-right">
                          <p className="text-[8px] uppercase font-black tracking-widest text-muted-foreground">Revenue</p>
                          <p className="text-sm font-black text-primary">${levelIncome.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Completion indicator */}
                    {isCompleted && level === 15 && (
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend / Feedback */}
            <div className="flex flex-wrap items-center gap-6 p-6 rounded-3xl bg-muted/10 border border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Active Level</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted" />
                <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Locked Tier</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Goal Completed</span>
              </div>
              <p className="ml-auto text-[10px] text-muted-foreground italic">
                * Levels 1-4 are granted instantly. Levels 5-15 unlock sequentially upon reaching volume targets.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <NetworkAnalytics />
        </TabsContent>

        <TabsContent value="tree" className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl font-black flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Network Visualization
            </h3>
            <p className="text-xs text-muted-foreground">Trace your entire lineage through the blockchain</p>
          </div>
          {user && (
            <div className="v56-glass premium-border rounded-3xl overflow-hidden min-h-[500px]">
              <ReferralTree userId={user.id} maxLevels={15} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl font-black flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Live Bonus Feed
            </h3>
            <p className="text-xs text-muted-foreground">Real-time commission tracking</p>
          </div>
          <Card className="v56-glass premium-border">
            <CardContent className="p-0">
              {commissions.length === 0 ? (
                <div className="py-20 text-center text-muted-foreground space-y-3">
                  <Award className="h-10 w-10 mx-auto opacity-10" />
                  <p className="text-sm">Waiting for first commission...</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {commissions.map((commission) => (
                    <div key={commission.id} className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                          <TrendingUp className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Level {commission.level}</p>
                          <p className="text-sm font-bold truncate">
                            {commission.profiles?.full_name || commission.profiles?.username || 'Partner Bonus'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-primary ">+${commission.commission_amount.toFixed(2)}</p>
                        <p className="text-[9px] text-muted-foreground">{new Date(commission.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
