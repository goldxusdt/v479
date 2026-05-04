import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gold3DIcon } from '@/components/ui/Gold3DIcon';
import { ChevronLeft, ChevronRight, Diamond, Percent } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/utils';
import { supabase } from '@/services/supabase';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

const pitches = [
  {
    title: "The Gold Standard",
    description: "Welcome to the world's most sophisticated gold investment ecosystem. We combine traditional asset stability with blockchain innovation.",
    icon: "security",
    badge: "Ecosystem",
    color: "from-primary/20 to-transparent"
  },
  {
    title: "Elite ROI Simulator",
    description: "Personalize your wealth strategy. Use our real-time calculator to project your future returns based on elite monthly performance.",
    icon: "growth",
    badge: "Interactive",
    color: "from-green-500/10 to-transparent",
    isCalculator: true
  },
  {
    title: "Bank-Grade Security",
    description: "Your digital assets are protected by top-tier encryption and full auditing. 100% transparency on every transaction, 100% security for your capital.",
    icon: "security",
    badge: "Transparency",
    color: "from-blue-500/10 to-transparent"
  },
  {
    title: "Infinite Network",
    description: "Unlock a powerful 15-tier referral structure. Earn from your network's growth at every level, creating a massive passive income stream.",
    icon: "network",
    badge: "15 Levels",
    color: "from-purple-500/10 to-transparent"
  },
  {
    title: "Instant Liquidity",
    description: "Access your earnings whenever you need them. Automated processing ensures your USDT is delivered instantly to your wallet.",
    icon: "withdrawal",
    badge: "Liquidity",
    color: "from-primary/20 to-transparent"
  }
];

const chartConfig: ChartConfig = {
  value: {
    label: "USDT Value",
    color: "hsl(var(--primary))"
  }
};

export function InvestmentPitch() {
  const [currentStep, setCurrentStep] = useState(0);
  const [amount, setAmount] = useState('1000');
  const [monthlyRoi, setMonthlyRoi] = useState(10);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from('settings').select('key, value');
      if (data) {
        const roiSetting = (data as any[]).find(s => s.key === 'monthly_roi_percentage');
        if (roiSetting) setMonthlyRoi(parseFloat(roiSetting.value));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const nextStep = () => {
    if (currentStep < pitches.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const current = pitches[currentStep];
  
  const chartData = useMemo(() => {
    const data = [];
    const baseAmount = parseFloat(amount) || 0;
    const rate = monthlyRoi / 100;
    
    for (let month = 0; month <= 12; month++) {
      let value = baseAmount + (baseAmount * rate * month);
      data.push({
        month: `M${month}`,
        value: parseFloat(value.toFixed(2))
      });
    }
    return data;
  }, [amount, monthlyRoi]);

  const totalValue = chartData[chartData.length - 1].value;
  const netProfit = totalValue - (parseFloat(amount) || 0);

  return (
    <section className="py-12 md:py-24 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-luxury-gradient opacity-40 z-[-1]" />
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-10 md:mb-16 space-y-4">
          <Badge variant="outline" className="border-primary/20 text-primary font-black tracking-[0.3em] uppercase px-8 py-2 rounded-full bg-primary/10">
            Investment Pitch
          </Badge>
          <h2 className="text-3xl md:text-7xl font-black v56-gradient-text tracking-tighter italic">Experience Elite Growth</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg md:text-xl italic font-medium opacity-80 leading-relaxed">Walk through our value proposition and discover why the world's most discerning investors choose Gold X Usdt.</p>
        </div>

        <div className="relative">
          <Card className={cn(
            "v56-glass border-primary/20 overflow-hidden transition-all duration-700 min-h-auto md:min-h-[600px] flex flex-col items-center gap-8 md:gap-12 p-6 md:p-16 relative",
            `bg-gradient-to-br ${current.color}`
          )}>
            <div className="w-full flex flex-col md:flex-row gap-8 lg:gap-24 flex-grow">
              <div className="flex-1 space-y-8 md:space-y-12 order-2 md:order-1 animate-in slide-in-from-left duration-700">
                <div className="space-y-4 md:space-y-6">
                  <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/20 font-black uppercase tracking-[0.4em] px-6 py-2 rounded-full text-[10px]">
                    {current.badge}
                  </Badge>
                  <h3 className="text-3xl md:text-7xl font-black italic tracking-tighter leading-none">{current.title}</h3>
                  <p className="text-base md:text-2xl text-muted-foreground leading-relaxed italic font-medium opacity-80">
                    "{current.description}"
                  </p>
                </div>

                {current.isCalculator && (
                   <div className="space-y-6 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] bg-white/5 border border-primary/20 gold-shimmer relative overflow-hidden">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                        <div className="space-y-4">
                          <Label className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                             Investment Amount
                          </Label>
                          <Input 
                            type="number" 
                            value={amount} 
                            onChange={(e) => setAmount(e.target.value)}
                            className="h-14 md:h-16 bg-black/40 border-primary/20 text-2xl md:text-3xl font-black italic focus:border-primary rounded-xl md:rounded-2xl"
                          />
                        </div>
                        <div className="flex flex-col justify-center gap-4">
                          <div className="space-y-4">
                            <Label className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center justify-between">
                               Monthly ROI (%)
                               <Badge variant="outline" className="text-[8px] bg-primary/10 border-primary/20 text-primary">Custom Input</Badge>
                            </Label>
                            <div className="relative">
                              <Percent className="absolute left-3 top-2.5 h-4 w-4 text-primary" />
                              <Input 
                                type="number" 
                                value={monthlyRoi} 
                                onChange={(e) => setMonthlyRoi(parseFloat(e.target.value) || 0)}
                                className="h-12 bg-black/40 border-primary/20 text-xl font-black italic focus:border-primary rounded-xl pl-10"
                                step="0.01"
                                min="0.01"
                                max="100"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                        <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl bg-black/40 border border-white/5">
                          <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-1">Net Profit (1 Year)</p>
                          <p className="text-2xl md:text-3xl font-black text-green-500 italic">+${netProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        </div>
                        <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl bg-black/40 border border-white/5">
                          <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-1">Total Value</p>
                          <p className="text-2xl md:text-3xl font-black text-white italic">${totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        </div>
                      </div>
                   </div>
                )}

                 <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 md:gap-8 pt-6">
                  {currentStep === pitches.length - 1 ? (
                    <Button asChild size="lg" className="h-14 md:h-20 px-8 md:px-16 rounded-xl md:rounded-[2rem] font-black tracking-[0.2em] uppercase premium-gradient shadow-luxury group transition-all hover:scale-105 active:scale-95 text-base md:text-xl">
                      <Link to="/signup" className="flex items-center justify-center gap-3">
                        Join Elite Network <Diamond className="h-5 w-5 md:h-6 md:w-6 group-hover:rotate-12 transition-transform" />
                      </Link>
                    </Button>
                  ) : (
                    <Button onClick={nextStep} size="lg" className="h-14 md:h-20 px-8 md:px-16 rounded-xl md:rounded-[2rem] font-black tracking-[0.2em] uppercase premium-gradient shadow-luxury group transition-all hover:scale-105 active:scale-95 text-base md:text-xl">
                      <span className="flex items-center justify-center gap-2">
                        Next Chapter <ChevronRight className="h-6 w-6 md:h-8 md:w-8 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </Button>
                  )}
                  
                  {currentStep > 0 && (
                    <Button onClick={prevStep} variant="ghost" size="sm" className="h-12 font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-white transition-all text-[10px]">
                      <ChevronLeft className="mr-2 h-4 w-4" /> Go Back
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 order-1 md:order-2 flex flex-col justify-center animate-in zoom-in duration-1000">
                {current.isCalculator ? (
                   <div className="w-full h-[300px] md:h-[400px] v56-glass border-primary/20 rounded-[2rem] md:rounded-[3rem] p-4 md:p-8 overflow-hidden relative">
                      <div className="absolute top-8 left-8 z-10">
                        <Badge className="bg-primary/20 text-primary border-none font-black text-[10px] px-4 py-1 uppercase tracking-widest">Growth Projection</Badge>
                      </div>
                      <ChartContainer config={chartConfig} className="w-full h-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 80, right: 30, left: 20, bottom: 20 }}>
                               <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,215,0,0.05)" />
                               <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                               <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                               <ChartTooltip content={<ChartTooltipContent />} />
                               <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={4} dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }} activeDot={{ r: 8, stroke: "white" }} />
                            </LineChart>
                         </ResponsiveContainer>
                      </ChartContainer>
                   </div>
                ) : (
                  <div className="relative flex justify-center">
                    <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full animate-pulse" />
                    <Gold3DIcon name={current.icon as any} size={300} className="relative z-10 floating" />
                  </div>
                )}
              </div>
            </div>

            {/* Progress Indicators */}
            <div className="mt-8 md:mt-12 flex gap-4 z-20">
              {pitches.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={cn(
                    "h-1.5 transition-all duration-700 rounded-full",
                    currentStep === idx ? "w-16 bg-primary" : "w-6 bg-white/10 hover:bg-white/20"
                  )}
                />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
