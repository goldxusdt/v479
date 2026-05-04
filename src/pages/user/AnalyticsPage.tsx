import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { getROIAnalytics, getWalletBalances } from '@/services/api';
import { BarChart3, TrendingUp, Calendar, Zap, ArrowLeft, Download, PieChart, Activity, DollarSign, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { SEOHead } from '@/utils/seo';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ProjectionHub } from '@/components/user/ProjectionHub';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function AnalyticsPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<any[]>([]);
  const [balances, setBalances] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user, period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [analyticsData, balanceData] = await Promise.all([
        getROIAnalytics(user!.id, parseInt(period)),
        getWalletBalances(user!.id)
      ]);
      setData(analyticsData);
      setBalances(balanceData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    if (!reportRef.current) return;
    
    try {
      setExporting(true);
      toast.info('Generating PDF report...');
      
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0a0a0a'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`GoldX-Portfolio-Analysis-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.success('Report downloaded successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to generate PDF report');
    } finally {
      setExporting(false);
    }
  };

  const totalROI = data.reduce((sum, d) => sum + (d.roi || 0), 0);
  const totalBonus = data.reduce((sum, d) => sum + (d.bonus || 0), 0);

  // Asset Allocation Data
  const allocationData = [
    { name: 'Deposits', value: balances?.deposit || 0, color: '#f59e0b' },
    { name: 'Invested', value: balances?.invested || 0, color: 'hsl(var(--primary))' },
    { name: 'ROI Wallet', value: balances?.roi || 0, color: '#10b981' },
    { name: 'Bonus Wallet', value: balances?.bonus || 0, color: '#3b82f6' },
    { name: 'Withdrawal', value: balances?.withdrawal || 0, color: '#ec4899' },
  ].filter(d => d.value > 0);

  // Risk Metrics Calculation (Simplified)
  const calculateVolatility = () => {
    if (data.length < 2) return 0;
    const values = data.map(d => (d.roi || 0) + (d.bonus || 0));
    const mean = values.reduce((a, b) => a + b) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  };

  const volatility = calculateVolatility();
  const sharpeRatio = volatility > 0 ? (totalROI / (volatility * Math.sqrt(data.length))) : 0;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto" ref={reportRef}>
      <SEOHead 
        title="Portfolio Analysis" 
        description="Track and manage your historical earnings growth and platform analysis."
      />

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="w-fit flex items-center gap-2 hover:bg-white/5" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="v56-glass border-primary/20 text-primary hover:bg-primary/10 gap-2"
            onClick={exportPDF}
            disabled={exporting || loading}
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export PDF Report
          </Button>
        </div>

        <div className="flex justify-between items-end flex-wrap gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-4xl font-black v56-gradient-text uppercase italic tracking-tight">Portfolio <span className="text-foreground">Analysis</span></h1>
            <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest opacity-60">Comprehensive performance & risk metrics</p>
          </div>
          
          <div className="flex items-center gap-3 bg-black/40 p-1 rounded-xl border border-white/5">
            <Calendar className="h-4 w-4 text-muted-foreground ml-3" />
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px] sm:w-[180px] border-none bg-transparent focus:ring-0">
                <SelectValue placeholder="Select Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
                <SelectItem value="365">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="v56-glass premium-border bg-primary/5 relative overflow-hidden group">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-black tracking-widest text-primary/60">Total Value</CardDescription>
            <CardTitle className="text-3xl font-black text-primary">${(balances?.total || 0).toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase">
              <Activity className="h-3 w-3 text-primary" />
              <span>Net Portfolio Value</span>
            </div>
          </CardContent>
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <DollarSign className="h-12 w-12" />
          </div>
        </Card>

        <Card className="v56-glass premium-border">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-black tracking-widest">Period Earnings</CardDescription>
            <CardTitle className="text-3xl font-black">${(totalROI + totalBonus).toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span>+{((totalROI + totalBonus) / (balances?.total || 1) * 100).toFixed(2)}% Growth</span>
            </div>
          </CardContent>
        </Card>

        <Card className="v56-glass premium-border">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-black tracking-widest">Risk Adjusted (Sharpe)</CardDescription>
            <CardTitle className="text-3xl font-black">{sharpeRatio.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase">
              <ShieldCheck className="h-3 w-3 text-blue-500" />
              <span>Efficiency Score</span>
            </div>
          </CardContent>
        </Card>

        <Card className="v56-glass premium-border">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-black tracking-widest">Volatility</CardDescription>
            <CardTitle className="text-3xl font-black">{volatility.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase">
              <AlertTriangle className="h-3 w-3 text-yellow-500" />
              <span>Earnings Stability</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 v56-glass premium-border overflow-hidden">
          <CardHeader className="border-b border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black uppercase tracking-tight">Historical Growth</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest">ROI vs Bonuses trends</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[350px] pt-6">
            {loading ? (
              <div className="h-full flex items-center justify-center animate-pulse">
                <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorRoi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorBonus" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fff" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#fff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="rgba(255,255,255,0.3)" 
                    fontSize={10} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(str) => {
                      try {
                        const date = new Date(str);
                        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                      } catch (e) {
                        return str;
                      }
                    }}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.3)" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(10, 10, 10, 0.95)', 
                      border: '1px solid rgba(255, 215, 0, 0.2)',
                      borderRadius: '16px',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                    itemStyle={{ color: '#fff' }}
                    cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1 }}
                  />
                  <Legend iconType="diamond" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', paddingTop: '20px', letterSpacing: '1px' }} />
                  <Area 
                    type="monotone" 
                    dataKey="roi" 
                    name="Personal ROI"
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorRoi)" 
                    animationDuration={1500}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="bonus" 
                    name="Network Bonus"
                    stroke="#fff" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorBonus)" 
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="v56-glass premium-border flex flex-col">
          <CardHeader className="border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <PieChart className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-lg font-black uppercase tracking-tight">Asset Allocation</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Portfolio breakdown</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center items-center py-6 min-h-[300px]">
            {loading ? (
              <Loader2 className="h-8 w-8 animate-spin text-blue-500/40" />
            ) : allocationData.length > 0 ? (
              <>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {allocationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(10, 10, 10, 0.95)', 
                          border: 'none',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full grid grid-cols-2 gap-2 mt-4">
                  {allocationData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground leading-none">{item.name}</span>
                        <span className="text-xs font-bold tabular-nums">${item.value.toFixed(0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest italic">No asset data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="v56-glass premium-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <CardTitle className="text-lg font-black uppercase tracking-tight text-green-500">Benchmark Comparison</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Platform Average vs Your Performance</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase tracking-widest">Your ROI Yield</span>
                <span className="text-sm font-bold text-primary">{(profile?.custom_roi_percentage || 10)}%</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full shadow-glow" style={{ width: `${Math.min(100, (Number(profile?.custom_roi_percentage || 10) / 15) * 100)}%` }} />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Platform Average</span>
                <span className="text-sm font-bold text-muted-foreground italic">~10.5%</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-white/10 rounded-full" style={{ width: '70%' }} />
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground leading-relaxed font-medium bg-primary/5 p-3 rounded-xl border border-primary/10">
              Your performance is currently <span className="text-primary font-bold">{(Number(profile?.custom_roi_percentage || 10) > 10.5 ? 'above' : 'aligned with')}</span> the platform benchmark. Consider inviting more users to boost your bonus yield.
            </p>
          </CardContent>
        </Card>

        <Card className="v56-glass premium-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Zap className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <CardTitle className="text-lg font-black uppercase tracking-tight text-yellow-500">Yield Optimization</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Tips to increase your portfolio value</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              <li className="flex gap-3 items-start">
                <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                <p className="text-xs text-muted-foreground"><span className="text-foreground font-bold">Compound ROI:</span> Enable compounding in settings to reinvest your ROI automatically for exponential growth.</p>
              </li>
              <li className="flex gap-3 items-start">
                <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                <p className="text-xs text-muted-foreground"><span className="text-foreground font-bold">Network Leverage:</span> Your referral bonus accounts for <span className="text-primary font-bold">{((totalBonus / (totalROI + totalBonus || 1)) * 100).toFixed(0)}%</span> of your period earnings. Expand your network to increase this ratio.</p>
              </li>
              <li className="flex gap-3 items-start">
                <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                <p className="text-xs text-muted-foreground"><span className="text-foreground font-bold">Diversify Plans:</span> Don't keep all funds in one plan. Different plans may have different lock periods and ROI rates.</p>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="pt-10 border-t border-white/5">
        <ProjectionHub 
          initialInvestment={profile?.target_usdt ? Number(profile.target_usdt) : undefined} 
          initialRoi={profile?.custom_roi_percentage ? Number(profile.custom_roi_percentage) : undefined} 
          profileTargets={profile?.referral_level_targets}
        />
      </div>
    </div>
  );
}
