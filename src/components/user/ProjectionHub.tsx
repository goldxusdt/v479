import { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Users, 
  TrendingUp, 
  Target,
  Calculator,
  Download,
  Share2,
  Lock,
  Zap,
  BarChart3,
  Wallet,
  Settings2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const COMMISSION_RATES = [
  0.08, 0.04, 0.02, 0.01, // L1-4 (8%, 4%, 2%, 1%)
  0.001, // L5 (0.1%)
  0.002, 0.003, 0.004, 0.005, 0.006, // L6-10
  0.007, 0.008, 0.009, 0.01, 0.04 // L11-15 (L15 = 4%)
];

const UNLOCK_TARGETS = [
  0, 0, 0, 0, // L1-4
  10000, // L5
  25000, 50000, 75000, 100000, 150000, // L6-10
  200000, 300000, 400000, 500000, 1000000 // L11-15
];

interface ProjectionHubProps {
  initialInvestment?: number;
  initialRoi?: number;
  profileTargets?: Record<string, number>;
}

export function ProjectionHub({ initialInvestment, initialRoi, profileTargets }: ProjectionHubProps) {
  // Shared State
  const [investmentAmount, setInvestmentAmount] = useState(0);
  const [avgNetworkInvestment, setAvgNetworkInvestment] = useState(0);
  const [monthlyRoiRate, setMonthlyRoiRate] = useState(0);
  const [months, setMonths] = useState(0);
  const [reinvestmentRate, setReinvestmentRate] = useState(0); // 0 to 100
  const [networkReinvestment, setNetworkReinvestment] = useState(0); // 0 to 100
  
  // Team Specific State
  const [l1Count, setL1Count] = useState(0);
  const [recruitmentRate, setRecruitmentRate] = useState(0);
  
  // 15 Level Manual Counts
  const [isManualLevels, setIsManualLevels] = useState(false);
  const [levelCounts, setLevelCounts] = useState<number[]>(new Array(15).fill(0));

  const handleReset = () => {
    setInvestmentAmount(0);
    setAvgNetworkInvestment(0);
    setMonthlyRoiRate(0);
    setMonths(0);
    setL1Count(0);
    setRecruitmentRate(0);
    setIsManualLevels(false);
    setLevelCounts(new Array(15).fill(0));
    setReinvestmentRate(0);
    setNetworkReinvestment(0);
    toast.success("Calculator reset to zero");
  };

  // Update local state when props change
  useEffect(() => {
    if (initialInvestment) setInvestmentAmount(initialInvestment);
  }, [initialInvestment]);

  useEffect(() => {
    if (initialRoi) setMonthlyRoiRate(initialRoi);
  }, [initialRoi]);

  const hubRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const calculations = useMemo(() => {
    // 1. Personal ROI
    const roiRate = monthlyRoiRate / 100;
    const personalReinvestRatio = reinvestmentRate / 100;
    const networkReinvestRatio = networkReinvestment / 100;
    
    let currentPersonalPrincipal = investmentAmount;
    let totalWithdrawnROI = 0;
    
    // 2. Team Growth Tracking
    let currentL1Count = l1Count;
    const levelInitialInvestments: number[] = [];
    const levelCountsSnapshot: number[] = [];
    
    for (let i = 0; i < 15; i++) {
      const actualLevelCount = isManualLevels ? (levelCounts[i] || 0) : currentL1Count;
      levelCountsSnapshot.push(actualLevelCount);
      levelInitialInvestments.push(actualLevelCount * avgNetworkInvestment);
      
      if (!isManualLevels) {
        currentL1Count = Math.floor(currentL1Count * recruitmentRate);
      }
    }

    let currentNetworkInvestmentByLevel = [...levelInitialInvestments];
    let totalTeamCommission = 0;
    let totalNetworkInvestment = 0;
    let totalNetworkSize = 0;

    // Month by Month Projection for growth effects
    for (let m = 0; m < months; m++) {
      // Personal Step
      const monthlyROI = currentPersonalPrincipal * roiRate;
      const reinvested = monthlyROI * personalReinvestRatio;
      currentPersonalPrincipal += reinvested;
      totalWithdrawnROI += (monthlyROI - reinvested);

      // Team Step (Assume network investment grows as a whole or by level)
      let currentMonthNetworkInvestment = 0;
      for (let l = 0; l < 15; l++) {
        const levelInvest = currentNetworkInvestmentByLevel[l];
        currentMonthNetworkInvestment += levelInvest;
        
        const customTarget = profileTargets?.[`level${l + 1}_target`];
        const targetToUse = customTarget !== undefined ? customTarget : UNLOCK_TARGETS[l];
        
        // Use total TNI from previous state to determine lock? No, usually it's current TNI
        const isLocked = totalNetworkInvestment < targetToUse; 
        
        if (!isLocked) {
          const levelCommission = (levelInvest * roiRate) * COMMISSION_RATES[l];
          totalTeamCommission += levelCommission;
        }

        // Grow level investment
        currentNetworkInvestmentByLevel[l] += (levelInvest * roiRate * networkReinvestRatio);
      }
      totalNetworkInvestment = currentMonthNetworkInvestment; // update total TNI for next month lock check
    }

    const personalROI = (currentPersonalPrincipal - investmentAmount) + totalWithdrawnROI;
    const depositFee = investmentAmount * 0.05;
    const netPersonal = currentPersonalPrincipal - depositFee + totalWithdrawnROI;

    // Prepare levels data for display (summary)
    const levels = levelCountsSnapshot.map((count, i) => {
      const initialLevelInvestment = count * avgNetworkInvestment;
      const customTarget = profileTargets?.[`level${i + 1}_target`];
      const targetToUse = customTarget !== undefined ? customTarget : UNLOCK_TARGETS[i];
      const isLocked = levelInitialInvestments.slice(0, i + 1).reduce((sum, val) => sum + val, 0) < targetToUse;
      
      return {
        level: `L${i + 1}`,
        count,
        investment: initialLevelInvestment,
        commission: (initialLevelInvestment * roiRate) * COMMISSION_RATES[i] * months, // Display simple static value for summary list
        rate: COMMISSION_RATES[i] * 100,
        isLocked
      };
    });

    totalNetworkSize = levelCountsSnapshot.reduce((sum, val) => sum + val, 0);

    return { 
      personalROI, 
      depositFee, 
      netPersonal, 
      levels, 
      totalTeamEarnings: totalTeamCommission, 
      totalNetworkSize, 
      grandTotal: personalROI + totalTeamCommission 
    };
  }, [investmentAmount, avgNetworkInvestment, monthlyRoiRate, months, reinvestmentRate, networkReinvestment, l1Count, recruitmentRate, isManualLevels, levelCounts, profileTargets]);

  // Chart Data
  const growthData = useMemo(() => {
    const data = [];
    const roiRate = monthlyRoiRate / 100;
    const personalReinvestRatio = reinvestmentRate / 100;
    const networkReinvestRatio = networkReinvestment / 100;
    
    let currentPrincipal = investmentAmount;
    let withdrawnAcc = 0;
    
    // Simplified team growth for chart (proportional to months)
    let teamInvestmentsByLevel = [];
    let currentL1Count = l1Count;
    for (let i = 0; i < 15; i++) {
        const count = isManualLevels ? (levelCounts[i] || 0) : currentL1Count;
        teamInvestmentsByLevel.push(count * avgNetworkInvestment);
        if (!isManualLevels) currentL1Count = Math.floor(currentL1Count * recruitmentRate);
    }
    
    let totalTeamCommissionAcc = 0;

    for (let i = 0; i <= months; i++) {
      if (i > 0) {
        const monthlyROI = currentPrincipal * roiRate;
        const reinvested = monthlyROI * personalReinvestRatio;
        currentPrincipal += reinvested;
        withdrawnAcc += (monthlyROI - reinvested);
        
        // Team side
        let currentMonthTNI = teamInvestmentsByLevel.reduce((sum, val) => sum + val, 0);
        for(let l = 0; l < 15; l++) {
            const levelInvest = teamInvestmentsByLevel[l];
            const customTarget = profileTargets?.[`level${l + 1}_target`];
            const targetToUse = customTarget !== undefined ? customTarget : UNLOCK_TARGETS[l];
            if (currentMonthTNI >= targetToUse) {
                totalTeamCommissionAcc += (levelInvest * roiRate * COMMISSION_RATES[l]);
            }
            teamInvestmentsByLevel[l] += (levelInvest * roiRate * networkReinvestRatio);
        }
      }
      
      const label = months > 24 ? (i % 12 === 0 ? `Y${i/12}` : `M${i}`) : `M${i}`;
      
      data.push({
        month: label,
        Personal: parseFloat((currentPrincipal + withdrawnAcc).toFixed(2)),
        Total: parseFloat((currentPrincipal + withdrawnAcc + totalTeamCommissionAcc).toFixed(2))
      });
    }
    return data;
  }, [investmentAmount, monthlyRoiRate, months, reinvestmentRate, networkReinvestment, l1Count, recruitmentRate, isManualLevels, levelCounts, avgNetworkInvestment, profileTargets]);

  const handleExportPDF = async () => {
    if (!hubRef.current) return;
    setIsExporting(true);
    toast.loading('Generating projection report...');
    try {
      const canvas = await html2canvas(hubRef.current, {
        scale: 2,
        backgroundColor: '#1a1a1a',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`wealth-projection-${Date.now()}.pdf`);
      toast.dismiss();
      toast.success('Report downloaded!');
    } catch (error) {
      toast.dismiss();
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const COLORS = ['#FFD700', '#D4AF37', '#B8860B', '#8B7500', '#705E00'];

  return (
    <div className="space-y-8" ref={hubRef}>
      {/* Unified Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight leading-tight">
            Wealth <span className="v56-gradient-text">Projection Hub</span>
          </h2>
          <p className="text-muted-foreground">Unified calculator for personal ROI and network growth.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground hover:text-destructive">
            <Settings2 className="mr-2 h-4 w-4" />
            Reset All
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isExporting} className="bg-white/5 border-white/10">
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            navigator.clipboard.writeText(`Check out my Gold X Usdt wealth projection! Total potential: $${calculations.grandTotal.toLocaleString()}`);
            toast.success("Projection link copied!");
          }} className="bg-white/5 border-white/10">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Unified Controls Sidebar */}
        <Card className="xl:col-span-4 v56-glass premium-border h-fit sticky top-24">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <CardTitle>Global Parameters</CardTitle>
            </div>
            <CardDescription>Link your personal and team strategy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Investment Amount */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-bold uppercase tracking-wider opacity-70">Your Investment</Label>
                <div className="flex items-center gap-2">
                  <span className="text-primary font-black text-xl">$</span>
                  <Input 
                    type="number" 
                    value={investmentAmount || ''} 
                    onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                    className="w-24 h-8 bg-white/5 border-white/10 text-right font-bold text-primary"
                    placeholder="0"
                  />
                </div>
              </div>
              <Slider value={[investmentAmount]} onValueChange={(val) => setInvestmentAmount(val[0])} min={0} max={50000} step={100} />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-bold uppercase tracking-wider opacity-70">Avg Partner Investment</Label>
                <div className="flex items-center gap-2">
                  <span className="text-primary font-black text-xl">$</span>
                  <Input 
                    type="number" 
                    value={avgNetworkInvestment || ''} 
                    onChange={(e) => setAvgNetworkInvestment(Number(e.target.value))}
                    className="w-24 h-8 bg-white/5 border-white/10 text-right font-bold text-primary"
                    placeholder="0"
                  />
                </div>
              </div>
              <Slider value={[avgNetworkInvestment]} onValueChange={(val) => setAvgNetworkInvestment(val[0])} min={0} max={50000} step={100} />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-bold uppercase tracking-wider opacity-70">Monthly ROI Rate (%)</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    value={monthlyRoiRate || ''} 
                    onChange={(e) => setMonthlyRoiRate(Number(e.target.value))}
                    className="w-24 h-8 bg-white/5 border-white/10 text-right font-bold text-primary"
                    placeholder="0"
                  />
                  <span className="text-primary font-black text-xl">%</span>
                </div>
              </div>
              <Slider value={[monthlyRoiRate]} onValueChange={(val) => setMonthlyRoiRate(val[0])} min={0} max={30} step={0.5} />
            </div>

            {/* Timeframe */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-bold uppercase tracking-wider opacity-70">Time Period (Months)</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    value={months || ''} 
                    onChange={(e) => setMonths(Number(e.target.value))}
                    className="w-24 h-8 bg-white/5 border-white/10 text-right font-bold text-primary"
                    placeholder="0"
                  />
                  <span className="text-primary font-bold">Mo</span>
                </div>
              </div>
              <Slider value={[months]} onValueChange={(val) => setMonths(val[0])} min={0} max={120} step={1} />
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
               <div className="flex items-center justify-between mb-2">
                 <Label className="text-xs font-black uppercase tracking-widest text-primary">Team Scaling</Label>
                 <div className="flex items-center gap-2">
                   <Label className="text-[10px] uppercase font-bold text-muted-foreground">Manual Levels</Label>
                   <Switch checked={isManualLevels} onCheckedChange={setIsManualLevels} />
                 </div>
               </div>
               
               {!isManualLevels ? (
                 <>
                   <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs opacity-70">Direct Referrals</Label>
                        <Input 
                          type="number" 
                          value={l1Count || ''} 
                          onChange={(e) => setL1Count(Number(e.target.value))}
                          className="w-20 h-7 bg-white/5 border-white/10 text-right font-bold"
                          placeholder="0"
                        />
                      </div>
                      <Slider value={[l1Count]} onValueChange={(val) => setL1Count(val[0])} min={0} max={100} step={1} />
                   </div>

                   <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs opacity-70">Duplication Multiplier</Label>
                        <Input 
                          type="number" 
                          value={recruitmentRate || ''} 
                          onChange={(e) => setRecruitmentRate(Number(e.target.value))}
                          className="w-20 h-7 bg-white/5 border-white/10 text-right font-bold"
                          placeholder="0"
                        />
                      </div>
                      <Slider value={[recruitmentRate]} onValueChange={(val) => setRecruitmentRate(val[0])} min={0} max={10} step={0.1} />
                   </div>
                 </>
               ) : (
                 <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                   <Label className="text-[10px] font-bold text-muted-foreground uppercase mb-2 block">Level Partner Counts</Label>
                   <Accordion type="single" collapsible className="w-full">
                     <AccordionItem value="levels" className="border-none">
                       <AccordionTrigger className="py-2 hover:no-underline v56-glass px-3 rounded-lg border border-white/5 mb-2">
                         <div className="flex items-center gap-2">
                           <Settings2 className="h-3 w-3 text-primary" />
                           <span className="text-xs font-bold uppercase tracking-widest">Edit 15 Levels</span>
                         </div>
                       </AccordionTrigger>
                       <AccordionContent className="pt-2 space-y-3 px-1">
                         {levelCounts.map((count, idx) => (
                           <div key={idx} className="flex items-center justify-between gap-4 p-2 rounded-lg bg-white/5 border border-white/5">
                             <Label className="text-[10px] font-black w-8">L{idx + 1}</Label>
                             <div className="flex-1">
                               <Slider 
                                 value={[count]} 
                                 onValueChange={(val) => {
                                   const newCounts = [...levelCounts];
                                   newCounts[idx] = val[0];
                                   setLevelCounts(newCounts);
                                 }} 
                                 max={Math.pow(10, Math.floor(idx/3) + 1)} 
                                 step={1} 
                               />
                             </div>
                             <Input 
                               type="number" 
                               value={count || ''} 
                               onChange={(e) => {
                                 const newCounts = [...levelCounts];
                                 newCounts[idx] = Number(e.target.value);
                                 setLevelCounts(newCounts);
                               }}
                               className="w-16 h-7 bg-black/40 border-white/10 text-[10px] font-bold text-right"
                             />
                           </div>
                         ))}
                       </AccordionContent>
                     </AccordionItem>
                   </Accordion>
                 </div>
               )}
            </div>

            <div className="pt-4 border-t border-white/5 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="flex items-center gap-2 font-black uppercase tracking-widest text-[10px] text-primary">
                    <Zap className="h-3 w-3" />
                    Personal Reinvestment
                  </Label>
                  <span className="text-xs font-bold">{reinvestmentRate}%</span>
                </div>
                <Slider value={[reinvestmentRate]} onValueChange={(val) => setReinvestmentRate(val[0])} min={0} max={100} step={5} />
                <p className="text-[9px] text-muted-foreground italic">Percentage of monthly ROI added back to your principal.</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="flex items-center gap-2 font-black uppercase tracking-widest text-[10px] text-primary">
                    <Users className="h-3 w-3" />
                    Team Reinvestment
                  </Label>
                  <span className="text-xs font-bold">{networkReinvestment}%</span>
                </div>
                <Slider value={[networkReinvestment]} onValueChange={(val) => setNetworkReinvestment(val[0])} min={0} max={100} step={5} />
                <p className="text-[9px] text-muted-foreground italic">Estimated percentage of your team's ROI they reinvest (affects your commissions).</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Display Area */}
        <div className="xl:col-span-8 space-y-8">
          {investmentAmount > 0 && months > 0 ? (
            <>
              {/* Main Stats Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="v56-glass border-primary/20 bg-primary/5 p-6 relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12 group-hover:rotate-0 transition-transform">
                <Wallet size={80} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Potential Wealth</p>
              <h3 className="text-3xl font-black v56-gradient-text text-glow tabular-nums">
                ${calculations.grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </h3>
              <p className="text-[10px] mt-2 flex items-center gap-1 text-green-500 font-bold">
                <TrendingUp className="h-3 w-3" />
                ROI + Team Commissions
              </p>
            </Card>

            <Card className="v56-glass border-white/10 p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Personal ROI Result</p>
              <h3 className="text-3xl font-black text-primary tabular-nums">
                ${calculations.personalROI.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </h3>
              <p className="text-[10px] mt-2 text-muted-foreground">
                Total yield over {months} months
              </p>
            </Card>

            <Card className="v56-glass border-white/10 p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Network Commission</p>
              <h3 className="text-3xl font-black text-primary tabular-nums">
                ${calculations.totalTeamEarnings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </h3>
              <p className="text-[10px] mt-2 text-muted-foreground">
                From {calculations.totalNetworkSize.toLocaleString()} partners
              </p>
            </Card>
          </div>

          <Tabs defaultValue="growth" className="w-full">
            <TabsList className="bg-black/40 border border-white/5 p-1 rounded-xl mb-6">
              <TabsTrigger value="growth" className="rounded-lg font-bold data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                <BarChart3 className="h-4 w-4 mr-2" />
                Wealth Growth
              </TabsTrigger>
              <TabsTrigger value="network" className="rounded-lg font-bold data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                <Users className="h-4 w-4 mr-2" />
                Network Depth
              </TabsTrigger>
              <TabsTrigger value="breakdown" className="rounded-lg font-bold data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                <Target className="h-4 w-4 mr-2" />
                Summary Table
              </TabsTrigger>
            </TabsList>

            <TabsContent value="growth" className="animate-in fade-in duration-500">
              <Card className="v56-glass premium-border bg-black/40 p-6 h-[450px]">
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-lg">Projected Cumulative Wealth</CardTitle>
                  <CardDescription>Personal equity vs total wealth with team bonus</CardDescription>
                </CardHeader>
                <ResponsiveContainer width="100%" height="80%">
                  <LineChart data={growthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="month" stroke="hsl(var(--primary))" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis stroke="hsl(var(--primary))" fontSize={10} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                    <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(10,10,10,0.95)', border: '1px solid hsl(var(--primary)/0.2)', borderRadius: '12px', color: '#fff' }} />
                    <Legend wrapperStyle={{ color: 'hsl(var(--primary))', fontSize: '10px' }} />
                    <Line type="monotone" dataKey="Personal" name="Personal Portfolio" stroke="#888" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="Total" name="Total Wealth Potential" stroke="hsl(var(--primary))" strokeWidth={4} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </TabsContent>

            <TabsContent value="network" className="animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="v56-glass premium-border bg-black/40 h-[400px]">
                  <CardHeader>
                    <CardTitle className="text-lg">Commission per Level</CardTitle>
                  </CardHeader>
                  <ResponsiveContainer width="100%" height="80%">
                    <BarChart data={calculations.levels.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="level" stroke="#666" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis stroke="#666" fontSize={10} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                      <RechartsTooltip cursor={{ fill: 'rgba(255,215,0,0.05)' }} contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
                      <Bar dataKey="commission" name="Earnings" radius={[4, 4, 0, 0]}>
                        {calculations.levels.map((l, index) => (
                          <Cell key={`cell-${index}`} fill={l.isLocked ? '#333' : COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                <Card className="v56-glass premium-border bg-black/40 overflow-hidden h-[400px]">
                  <CardHeader>
                    <CardTitle className="text-lg">Full Tier Analysis</CardTitle>
                    <CardDescription>Locked levels require higher team volume</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 h-[300px] overflow-y-auto hide-scrollbar px-6">
                    <div className="space-y-3 pb-6">
                      {calculations.levels.map((l, i) => (
                        <div key={i} className={hubCn("flex items-center justify-between p-3 rounded-xl border transition-all", l.isLocked ? "border-white/5 opacity-40 grayscale" : "border-primary/20 bg-primary/5")}>
                          <div className="flex items-center gap-3">
                             <div className={hubCn("w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs", l.isLocked ? "bg-white/10" : "bg-primary/20 text-primary")}>
                                {l.level}
                             </div>
                             <div>
                               <p className="text-[10px] font-black uppercase tracking-widest">{l.rate}% Commission</p>
                               <p className="text-[10px] text-muted-foreground">{l.count.toLocaleString()} Partners</p>
                             </div>
                          </div>
                          <div className="text-right">
                             {l.isLocked ? <Lock className="h-3 w-3 text-muted-foreground ml-auto" /> : <p className="text-sm font-black text-primary">${l.commission.toLocaleString()}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="breakdown" className="animate-in fade-in duration-500">
               <Card className="v56-glass premium-border bg-black/40 overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg">Projected Financial Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead className="bg-primary/5 text-primary border-y border-primary/10">
                        <tr>
                          <th className="px-6 py-3 font-bold uppercase tracking-widest text-[10px]">Financial Item</th>
                          <th className="px-6 py-3 font-bold uppercase tracking-widest text-[10px]">Details</th>
                          <th className="px-6 py-3 font-bold uppercase tracking-widest text-[10px] text-right">Estimate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        <tr>
                          <td className="px-6 py-4 font-bold">Personal ROI</td>
                          <td className="px-6 py-4 text-muted-foreground italic">10% / month for {months}mo</td>
                          <td className="px-6 py-4 text-right font-mono text-primary font-bold">${calculations.personalROI.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 font-bold">L1-L4 Commissions</td>
                          <td className="px-6 py-4 text-muted-foreground italic">Core Network Earnings</td>
                          <td className="px-6 py-4 text-right font-mono text-primary font-bold">
                            ${calculations.levels.slice(0, 4).reduce((sum, l) => sum + l.commission, 0).toLocaleString()}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 font-bold">Elite Tier (L5-L15)</td>
                          <td className="px-6 py-4 text-muted-foreground italic">Unlocked Performance Tiers</td>
                          <td className="px-6 py-4 text-right font-mono text-primary font-bold">
                            ${calculations.levels.slice(4).reduce((sum, l) => sum + l.commission, 0).toLocaleString()}
                          </td>
                        </tr>
                        <tr className="bg-primary/10">
                          <td className="px-6 py-4 font-black uppercase text-primary">Total Growth Potential</td>
                          <td className="px-6 py-4 text-muted-foreground italic">Combined ROI + Commissions</td>
                          <td className="px-6 py-4 text-right font-black text-primary text-xl font-mono">${calculations.grandTotal.toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] v56-glass premium-border rounded-3xl p-12 text-center space-y-6 animate-in fade-in zoom-in duration-700">
              <div className="p-6 rounded-full bg-primary/10 border border-primary/20">
                <Calculator className="h-12 w-12 text-primary" />
              </div>
              <div className="space-y-2 max-w-sm">
                <h3 className="text-2xl font-black uppercase tracking-tighter italic">Calculation Ready</h3>
                <p className="text-muted-foreground font-medium">Please enter your investment amount and preferred time period to see your potential wealth growth.</p>
              </div>
              <div className="flex gap-4">
                <Badge variant="outline" className="px-4 py-1 border-primary/20 text-primary font-bold">10% Monthly ROI</Badge>
                <Badge variant="outline" className="px-4 py-1 border-primary/20 text-primary font-bold">15 Level Rewards</Badge>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function hubCn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
