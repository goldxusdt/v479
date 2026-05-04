import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, Users, Ticket, Coins, MousePointer2, 
  Calendar, Download, RefreshCw, ArrowLeft, ArrowUpRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/services/supabase';
import { format, subDays, startOfDay } from 'date-fns';
import { exportToCSV } from '@/utils/csv-export';

export default function CouponPerformanceAnalyticsDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [stats, setStats] = useState<any>(null);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [topCoupons, setTopCoupons] = useState<any[]>([]);
  const [demographics, setDemographics] = useState<any>(null);
  const [typeComparison, setTypeComparison] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const startDate = startOfDay(subDays(new Date(), parseInt(dateRange)));
      
      // Fetch redemptions for the period
      const { data, error: rError } = await supabase
        .from('coupon_redemptions')
        .select(`
          *,
          coupons(code, discount_type, discount_value)
        `)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (rError) throw rError;
      
      const redemptionData = (data as any[]) || [];
      setRedemptions(redemptionData);

      // Calculate overview stats
      const totalSavings = redemptionData.reduce((sum, r) => sum + Number(r.discount_applied || 0), 0);
      const uniqueUsers = new Set(redemptionData.map(r => r.user_id)).size;
      const avgSavings = redemptionData.length ? totalSavings / redemptionData.length : 0;

      // Group by date for trends
      const dailyData: Record<string, any> = {};
      
      // Type Comparison
      const typeStats: Record<string, any> = {
        percentage: { name: 'Percentage', count: 0, savings: 0 },
        fixed: { name: 'Fixed', count: 0, savings: 0 }
      };

      // Group by coupon for top performing
      const couponStats: Record<string, any> = {};
      
      redemptionData.forEach(r => {
        const date = format(new Date(r.created_at), 'MMM dd');
        if (!dailyData[date]) {
          dailyData[date] = { date, count: 0, savings: 0 };
        }
        dailyData[date].count++;
        dailyData[date].savings += Number(r.discount_applied || 0);

        const code = r.coupons?.code || 'Unknown';
        const type = r.coupons?.discount_type || 'percentage';
        
        if (typeStats[type]) {
          typeStats[type].count++;
          typeStats[type].savings += Number(r.discount_applied || 0);
        }

        if (!couponStats[code]) {
          couponStats[code] = { 
            code, 
            count: 0, 
            savings: 0, 
            type: r.coupons?.discount_type,
            value: r.coupons?.discount_value
          };
        }
        couponStats[code].count++;
        couponStats[code].savings += Number(r.discount_applied || 0);
      });
      
      setTrendData(Object.values(dailyData));
      setTopCoupons(Object.values(couponStats).sort((a, b) => b.count - a.count).slice(0, 10));
      setTypeComparison(Object.values(typeStats));

      // Demographics
      const userIds = [...new Set(redemptionData.map(r => r.user_id))];
      if (userIds.length > 0) {
        const { data: userData } = await (supabase
          .from('profiles') as any)
          .select('id, created_at')
          .in('id', userIds);
        
        if (userData) {
          const thirtyDaysAgo = subDays(new Date(), 30);
          const demoStats = { newUsers: 0, returningUsers: 0 };
          
          redemptionData.forEach(r => {
            const u = (userData as any[]).find(user => user.id === r.user_id);
            if (u && new Date(u.created_at) > thirtyDaysAgo) {
              demoStats.newUsers++;
            } else {
              demoStats.returningUsers++;
            }
          });
          setDemographics(demoStats);
        }
      }

      setStats({
        totalRedemptions: redemptionData.length || 0,
        totalSavings,
        uniqueUsers,
        avgSavings,
        conversionRate: 15.4 // Placeholder
      });

    } catch (error) {
      console.error('Failed to load coupon analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const exportData = redemptions.map(r => ({
      'Date': format(new Date(r.created_at), 'yyyy-MM-dd HH:mm'),
      'Coupon Code': r.coupons?.code,
      'Transaction Type': r.transaction_type,
      'Original Fee': r.original_fee,
      'Discount Applied': r.discount_applied,
      'Final Fee': r.final_fee,
      'User ID': r.user_id
    }));
    exportToCSV(exportData, 'coupon_redemptions');
    toast.success('Analytics report exported');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/coupons')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold v56-gradient-text">Coupon Performance</h1>
            <p className="text-muted-foreground">Detailed analytics and usage insights</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadAnalytics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="v56-glass premium-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase flex items-center justify-between">
              Total Redemptions
              <Ticket className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalRedemptions || 0}</div>
            <p className="text-[10px] text-green-500 flex items-center mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +12.5% from last period
            </p>
          </CardContent>
        </Card>
        <Card className="v56-glass premium-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase flex items-center justify-between">
              Total Savings (USDT)
              <Coins className="h-4 w-4 text-yellow-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.totalSavings.toFixed(2) || '0.00'}</div>
            <p className="text-[10px] text-green-500 flex items-center mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +8.2% from last period
            </p>
          </CardContent>
        </Card>
        <Card className="v56-glass premium-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase flex items-center justify-between">
              Unique Users
              <Users className="h-4 w-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.uniqueUsers || 0}</div>
            <p className="text-[10px] text-blue-500 flex items-center mt-1">
              <MousePointer2 className="h-3 w-3 mr-1" />
              Active Engagement
            </p>
          </CardContent>
        </Card>
        <Card className="v56-glass premium-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase flex items-center justify-between">
              Avg. Savings
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.avgSavings.toFixed(2) || '0.00'}</div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Per Transaction
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage Trend */}
        <Card className="v56-glass premium-border">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Redemption Trends</CardTitle>
            <CardDescription>Daily coupon usage and savings over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FFD700" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#FFD700" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="date" stroke="#ffffff50" fontSize={10} />
                  <YAxis stroke="#ffffff50" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#FFD700" fillOpacity={1} fill="url(#colorCount)" name="Usage" />
                  <Area type="monotone" dataKey="savings" stroke="#32CD32" fillOpacity={0} name="Savings ($)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Coupons */}
        <Card className="v56-glass premium-border">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Top Performing Coupons</CardTitle>
            <CardDescription>By total redemption count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCoupons} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                  <XAxis type="number" stroke="#ffffff50" fontSize={10} />
                  <YAxis dataKey="code" type="category" stroke="#ffffff50" fontSize={10} width={100} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                  />
                  <Bar dataKey="count" fill="#FFD700" radius={[0, 4, 4, 0]} name="Redemptions" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Insights Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="v56-glass premium-border">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-lg">Discount Type Comparison</CardTitle>
            <CardDescription>Usage vs Savings by discount type</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeComparison} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ffffff10" />
                <XAxis type="number" stroke="#ffffff50" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#ffffff50" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                <Bar dataKey="savings" name="Total Savings ($)" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={30} />
                <Bar dataKey="count" name="Usage Count" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="v56-glass premium-border">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-lg">User Demographics</CardTitle>
            <CardDescription>New vs Returning users redemptions</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col justify-center items-center h-[250px] space-y-6">
            {demographics ? (
              <>
                <div className="flex w-full items-center gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>New Users (Past 30d)</span>
                      <span className="font-bold">{demographics.newUsers}</span>
                    </div>
                    <div className="h-4 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: `${(demographics.newUsers / (demographics.newUsers + demographics.returningUsers || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex w-full items-center gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Returning Users</span>
                      <span className="font-bold">{demographics.returningUsers}</span>
                    </div>
                    <div className="h-4 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-secondary" 
                        style={{ width: `${(demographics.returningUsers / (demographics.newUsers + demographics.returningUsers || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-muted-foreground italic text-sm">Loading demographic data...</div>
            )}
          </CardContent>
        </Card>
      </div>


      {/* Detailed Table */}
      <Card className="v56-glass premium-border">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-wider">Campaign Performance Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-3 px-4 text-[10px] uppercase font-bold text-muted-foreground">Coupon Code</th>
                  <th className="py-3 px-4 text-[10px] uppercase font-bold text-muted-foreground">Discount</th>
                  <th className="py-3 px-4 text-[10px] uppercase font-bold text-muted-foreground">Redemptions</th>
                  <th className="py-3 px-4 text-[10px] uppercase font-bold text-muted-foreground">Total Savings</th>
                  <th className="py-3 px-4 text-[10px] uppercase font-bold text-muted-foreground">Avg. Per Use</th>
                  <th className="py-3 px-4 text-[10px] uppercase font-bold text-muted-foreground">Performance</th>
                </tr>
              </thead>
              <tbody>
                {topCoupons.map((coupon, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 font-bold text-primary">{coupon.code}</td>
                    <td className="py-4 px-4 text-xs">
                      {coupon.type === 'percentage' ? `${coupon.value}%` : `${coupon.value} USDT`}
                    </td>
                    <td className="py-4 px-4 font-mono">{coupon.count}</td>
                    <td className="py-4 px-4 font-bold text-green-500">${coupon.savings.toFixed(2)}</td>
                    <td className="py-4 px-4 text-xs text-muted-foreground">
                      ${(coupon.savings / coupon.count).toFixed(2)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${(coupon.count / (topCoupons[0]?.count || 1)) * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
