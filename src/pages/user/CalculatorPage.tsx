import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft,
  TrendingUp,
  Users,
  Calculator,
  DollarSign,
  Percent
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SEOHead } from '@/utils/seo';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '@/services/supabase';

export default function CalculatorPage() {
  const navigate = useNavigate();
  
  // Investment inputs
  const [investment, setInvestment] = useState('1000');
  const [months, setMonths] = useState('12');
  const [monthlyROI, setMonthlyROI] = useState('10');
  
  // Referral inputs - 15 levels
  const [referrals, setReferrals] = useState<string[]>(Array(15).fill('0'));
  const [commissionRates, setCommissionRates] = useState([8, 4, 2, 1, 0.5, 0.25, 0.25, 0.25, 0.25, 0.25, 0.1, 0.1, 0.1, 0.1, 0.1]);
  
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase.from('settings').select('key, value');
    if (data) {
      const rates = [...commissionRates];
      const roiSetting = (data as any[]).find(s => s.key === 'monthly_roi_percentage' || s.key === 'monthly_roi');
      if (roiSetting) setMonthlyROI(roiSetting.value);

      for (let i = 1; i <= 15; i++) {
        const key = `level${i}_commission`;
        const setting = (data as any[]).find(s => s.key === key);
        if (setting) {
          rates[i-1] = parseFloat(setting.value);
        }
      }
      setCommissionRates(rates);
    }
  };

  const calculateResults = () => {
    const investmentAmount = parseFloat(investment) || 0;
    const period = parseInt(months) || 0;
    const roi = parseFloat(monthlyROI) || 0;
    
    // Personal ROI calculation
    const depositFee = investmentAmount * 0.05;
    const netInvestment = investmentAmount - depositFee;
    
    let currentBalance = netInvestment;
    let totalROIEarned = 0;
    const monthlyProjections = [];

    for (let i = 1; i <= period; i++) {
      const monthlyROIValue = currentBalance * (roi / 100);
      totalROIEarned += monthlyROIValue;
      
      monthlyProjections.push({
        month: i,
        balance: parseFloat(currentBalance.toFixed(2)),
        roi: parseFloat(monthlyROIValue.toFixed(2)),
        totalROI: parseFloat(totalROIEarned.toFixed(2))
      });
    }

    const withdrawalFee = currentBalance * 0.05;
    const netPayout = currentBalance - withdrawalFee;
    
    // Referral commission calculation
    const levelCommissions = referrals.map((count, idx) => {
      const referralCount = parseInt(count) || 0;
      const commission = referralCount * investmentAmount * (commissionRates[idx] / 100);
      return {
        level: idx + 1,
        referrals: referralCount,
        rate: commissionRates[idx],
        commission: commission
      };
    });
    
    const totalReferralCommission = levelCommissions.reduce((sum, level) => sum + level.commission, 0);
    
    return {
      investment: investmentAmount,
      depositFee,
      netInvestment,
      totalROI: totalROIEarned,
      withdrawalFee,
      netPayout,
      levelCommissions,
      totalReferralCommission,
      monthlyProjections,
      grandTotal: netPayout + totalReferralCommission
    };
  };

  const results = useMemo(() => showResults ? calculateResults() : null, [showResults, investment, months, monthlyROI, referrals]);

  const handleCalculate = () => {
    setShowResults(true);
  };

  const handleReset = () => {
    setInvestment('1000');
    setMonths('12');
    setMonthlyROI('10');
    setReferrals(Array(15).fill('0'));
    setShowResults(false);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <SEOHead 
        title="Investment Calculator" 
        description="Calculate your potential returns and network earnings with our comprehensive investment calculator."
      />
      
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold v56-gradient-text">Investment Calculator</h1>
            <p className="text-sm text-muted-foreground mt-1">Calculate your potential earnings from investment and referrals</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-6">
            {/* Personal Investment */}
            <Card className="v56-glass premium-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <DollarSign className="h-5 w-5" />
                  Personal Investment
                </CardTitle>
                <CardDescription>Enter your investment details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="investment" className="text-foreground font-medium">Investment Amount (USDT)</Label>
                  <Input
                    id="investment"
                    type="number"
                    value={investment}
                    onChange={(e) => setInvestment(e.target.value)}
                    placeholder="1000"
                    className="text-lg"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="months" className="text-foreground font-medium">Investment Period (Months)</Label>
                  <Input
                    id="months"
                    type="number"
                    value={months}
                    onChange={(e) => setMonths(e.target.value)}
                    placeholder="12"
                    className="text-lg"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="roi" className="text-foreground font-medium">Monthly ROI (%)</Label>
                  <Input
                    id="roi"
                    type="number"
                    step="0.1"
                    value={monthlyROI}
                    onChange={(e) => setMonthlyROI(e.target.value)}
                    placeholder="10"
                    className="text-lg"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Referral Network */}
            <Card className="v56-glass premium-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Users className="h-5 w-5" />
                  15-Tier Identity Network
                </CardTitle>
                <CardDescription>Track referrals by User Identity (Accounts per level)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2">
                  {Array.from({ length: 15 }, (_, i) => (
                    <div key={i} className="space-y-1">
                      <Label className="text-xs text-foreground font-bold">
                        Level {i + 1} Accounts
                      </Label>
                      <Input
                        type="number"
                        value={referrals[i]}
                        onChange={(e) => {
                          const newReferrals = [...referrals];
                          newReferrals[i] = e.target.value;
                          setReferrals(newReferrals);
                        }}
                        placeholder="0"
                        className="h-9 border-primary/20 focus:border-primary"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button 
                onClick={handleCalculate} 
                className="flex-1 premium-gradient text-white font-bold h-12"
              >
                <Calculator className="h-5 w-5 mr-2" />
                Calculate Returns
              </Button>
              <Button 
                onClick={handleReset} 
                variant="outline"
                className="h-12"
              >
                Reset
              </Button>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {!showResults ? (
              <Card className="v56-glass premium-border h-full flex items-center justify-center min-h-[500px]">
                <CardContent className="text-center py-12">
                  <Calculator className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg text-muted-foreground">Enter your details and click Calculate to see results</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Summary Card */}
                <Card className="v56-glass border-primary/40 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Total Projected Earnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl md:text-5xl font-black v56-gradient-text mb-6">
                      ${results?.grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Personal ROI</p>
                        <p className="text-xl font-bold text-foreground">${results?.netPayout.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Identity-Based Commission</p>
                        <p className="text-xl font-bold text-foreground">${results?.totalReferralCommission.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Portfolio Growth Chart */}
                {results && results.monthlyProjections.length > 0 && (
                  <Card className="v56-glass premium-border overflow-hidden">
                    <CardHeader className="bg-primary/5 border-b border-primary/10">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Portfolio Growth Projection
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={results.monthlyProjections}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis 
                            dataKey="month" 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            label={{ value: 'Month', position: 'insideBottom', offset: -10, fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `$${value}`}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              borderColor: 'hsl(var(--primary) / 0.2)',
                              borderRadius: '8px',
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                            }}
                            itemStyle={{ color: 'hsl(var(--primary))' }}
                          />
                          <Bar dataKey="balance" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Investment Breakdown */}
                <Card className="v56-glass premium-border">
                  <CardHeader>
                    <CardTitle className="text-lg">Investment Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Initial Investment:</span>
                      <span className="font-semibold text-foreground">${results?.investment.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deposit Fee (5%):</span>
                      <span className="font-semibold text-destructive">-${results?.depositFee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Net Investment:</span>
                      <span className="font-semibold text-foreground">${results?.netInvestment.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-border">
                      <span className="text-muted-foreground">Total ROI Earned:</span>
                      <span className="font-semibold text-primary">${results?.totalROI.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Withdrawal Fee (5%):</span>
                      <span className="font-semibold text-destructive">-${results?.withdrawalFee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-border font-bold">
                      <span className="text-foreground">Net Payout:</span>
                      <span className="text-primary">${results?.netPayout.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Commission Chart */}
                {results && results.levelCommissions.some(l => l.commission > 0) && (
                  <Card className="v56-glass premium-border">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Percent className="h-5 w-5 text-primary" />
                        Commission Per Level
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={results.levelCommissions.filter(l => l.commission > 0)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="level" 
                            stroke="hsl(var(--foreground))"
                            tick={{ fill: 'hsl(var(--foreground))' }}
                            label={{ value: 'Level', position: 'insideBottom', offset: -5, fill: 'hsl(var(--foreground))' }}
                          />
                          <YAxis 
                            stroke="hsl(var(--foreground))"
                            tick={{ fill: 'hsl(var(--foreground))' }}
                            label={{ value: 'Commission (USDT)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--foreground))' }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              color: 'hsl(var(--foreground))'
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                          />
                          <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
                          <Bar dataKey="commission" fill="hsl(var(--primary))" name="Commission (USDT)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <Card className="v56-glass border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="pt-6">
            <p className="text-sm text-foreground leading-relaxed">
              <strong>⚠️ Disclaimer:</strong> These calculations are estimates based on the inputs provided. Actual returns may vary based on platform performance and individual circumstances. This calculator is for informational purposes only and does not constitute financial advice.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
