import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { 
  Network, 
  ChevronRight, 
  ChevronDown, 
  User, 
  Calendar, 
  ShieldCheck, 
  Users, 
  TrendingUp, 
  ArrowLeft,
  Download,
  Search,
  Filter,
  PieChart,
  BarChart3,
  Image as ImageIcon,
  Share2 as ShareIcon,
  MoreHorizontal,
  Mail,
  History,
  Lock
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  Legend as RechartsLegend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface DownlineUser {
  user_id: string;
  username: string;
  email: string;
  level: number;
  referrer_id: string;
  created_at: string;
  kyc_status: string;
  is_active: boolean;
  children?: DownlineUser[];
}

interface CommissionStat {
  level: number;
  total_commission: number;
  member_count: number;
  commission_rate: number;
}

export default function AdvancedReferralPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [downline, setDownline] = useState<DownlineUser[]>([]);
  const [stats, setStats] = useState<CommissionStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const treeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const isLevelEnabled = (level: number) => {
    if (level <= 4) return true; // Levels 1-4 are usually always enabled
    const key = `referral_level_${level}_enabled`;
    return !!(profile as any)?.[key];
  };

  const getLevelTarget = (level: number) => {
    const targets = (profile as any)?.referral_level_targets || {};
    const key = `level${level}_target`;
    const defaults = [0,0,0,0,10000, 25000, 50000, 100000, 200000, 400000, 800000, 1600000, 3200000, 6400000, 12800000];
    return targets[key] || defaults[level-1] || 0;
  };

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      console.log('Loading advanced referral data for user:', user.id);
      
      const { data: downlineData, error: downlineError } = await (supabase.rpc as any)('get_downline_network', { 
        p_user_id: user.id,
        p_max_levels: 15
      });

      if (downlineError) {
        console.error('Downline RPC Error:', downlineError);
        throw downlineError;
      }

      const { data: statsData, error: statsError } = await (supabase.rpc as any)('get_referral_commission_stats', { 
        p_user_id: user.id 
      });

      if (statsError) {
        console.error('Stats RPC Error:', statsError);
        throw statsError;
      }

      setDownline(downlineData || []);
      setStats(statsData || []);
      console.log('Referral data loaded successfully:', {
        downlineCount: Array.isArray(downlineData) ? downlineData.length : 0,
        statsCount: Array.isArray(statsData) ? statsData.length : 0
      });
    } catch (error: unknown) {
      console.error('Failed to load referral data:', error);
      toast.error(`Error: ${(error as any).message || 'Failed to load referral data'}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (userId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedNodes(newExpanded);
  };

  const buildTree = (users: DownlineUser[]) => {
    const userMap = new Map<string, DownlineUser>();
    const rootNodes: DownlineUser[] = [];

    // Initialize all nodes
    users.forEach(u => {
      userMap.set(u.user_id, { ...u, children: [] });
    });

    // Link nodes to their parents
    users.forEach(u => {
      const node = userMap.get(u.user_id)!;
      if (u.referrer_id === user?.id) {
        rootNodes.push(node);
      } else {
        const parent = userMap.get(u.referrer_id);
        if (parent) {
          parent.children?.push(node);
        }
      }
    });

    return rootNodes;
  };

  const filteredDownline = downline.filter(u => {
    const matchesSearch = u.username?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = levelFilter === 'all' || u.level === parseInt(levelFilter);
    return matchesSearch && matchesLevel;
  });

  const treeData = buildTree(filteredDownline);

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Advanced Referral Report', 14, 20);
    doc.setFontSize(12);
    doc.text(`User: ${user?.email}`, 14, 30);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 37);

    // Commission Stats Table
    doc.text('Commission Statistics by Level', 14, 50);
    (doc as any).autoTable({
      startY: 55,
      head: [['Level', 'Commission Rate', 'Members', 'Total Earned']],
      body: stats.map(s => [
        `Level ${s.level}`,
        `${(s.commission_rate * 100).toFixed(1)}%`,
        s.member_count,
        `${Number(s.total_commission).toFixed(2)} USDT`
      ]),
    });

    // Downline Members Table
    const lastY = (doc as any).lastAutoTable.finalY + 15;
    doc.text('Downline Network Members', 14, lastY);
    (doc as any).autoTable({
      startY: lastY + 5,
      head: [['Username', 'Email', 'Level', 'Join Date', 'KYC']],
      body: downline.map(u => [
        u.username || 'N/A',
        u.email || 'N/A',
        u.level,
        new Date(u.created_at).toLocaleDateString(),
        u.kyc_status
      ]),
    });

    doc.save('referral_report.pdf');
    toast.success('Report exported as PDF');
  };

  const handleShare = async () => {
    if (!treeRef.current) return;
    try {
      const canvas = await html2canvas(treeRef.current, {
        backgroundColor: '#0a0b1e',
        scale: 2,
        logging: false,
        useCORS: true
      });
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Canvas to Blob failed');

      if (navigator.share) {
        const file = new File([blob], 'genealogy_tree.png', { type: 'image/png' });
        await navigator.share({
          title: 'My Network Genealogy Tree',
          text: 'Check out my referral network tree on Gold X Usdt!',
          files: [file]
        });
        toast.success('Shared successfully');
      } else {
        // Fallback: Just trigger download
        await exportTreeAsImage();
        toast.info('Sharing not supported on this browser, file downloaded instead');
      }
    } catch (error) {
      console.error('Share failed:', error);
      toast.error('Failed to share');
    }
  };

  const exportTreeAsImage = async () => {
    if (!treeRef.current) return;
    setLoading(true);
    try {
      const canvas = await html2canvas(treeRef.current, {
        backgroundColor: '#0a0b1e', // Match theme background
        scale: 2, // High resolution
        logging: false,
        useCORS: true
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      link.download = `genealogy_tree_${new Date().getTime()}.png`;
      link.click();
      toast.success('Genealogy tree exported as image');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export genealogy tree');
    } finally {
      setLoading(false);
    }
  };

  const exportTreeAsPDF = async () => {
    if (!treeRef.current) return;
    setLoading(true);
    try {
      const canvas = await html2canvas(treeRef.current, {
        backgroundColor: '#0a0b1e',
        scale: 2,
        logging: false,
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`genealogy_tree_${new Date().getTime()}.pdf`);
      toast.success('Genealogy tree exported as PDF');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export genealogy tree');
    } finally {
      setLoading(false);
    }
  };

  const TreeNode = ({ node, level = 0 }: { node: DownlineUser; level?: number }) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.user_id);

    return (
      <div className="ml-4 @md:ml-6 mt-2">
        <div 
          className="flex items-center gap-2 p-3 v56-glass premium-border rounded-lg cursor-pointer hover:bg-accent/20 transition-all"
          onClick={() => hasChildren && toggleNode(node.user_id)}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <div className="w-4" />
          )}
          <div className="p-1.5 bg-background rounded-full border border-primary/20">
            <User className="h-3 w-3 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold truncate text-sm">{node.username}</span>
              <Badge variant="outline" className="text-[10px] h-4">Level {node.level}</Badge>
              {node.kyc_status === 'approved' && (
                <ShieldCheck className="h-3 w-3 text-green-500" />
              )}
            </div>
            <p className="text-[10px] text-muted-foreground truncate">{node.email}</p>
          </div>
          <div className="text-right shrink-0 flex items-center gap-4">
            <div className="hidden @md:flex flex-col items-end text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{new Date(node.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/20">
                  <MoreHorizontal className="h-4 w-4 text-primary" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="v56-glass premium-border rounded-xl">
                <DropdownMenuLabel className="text-[10px] uppercase font-black tracking-widest opacity-50">Partner Actions</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.location.href = `mailto:${node.email}`; }} className="cursor-pointer">
                  <Mail className="mr-2 h-4 w-4" /> Contact Partner
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/referrals/advanced?search=${node.username}`); }} className="cursor-pointer">
                  <Search className="mr-2 h-4 w-4" /> Focus on Team
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="cursor-pointer">
                  <History className="mr-2 h-4 w-4" /> Performance History
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {isExpanded && hasChildren && (
          <div className="border-l-2 border-primary/10 ml-5 pl-2 mt-2 space-y-2">
            {node.children!.map(child => (
              <TreeNode key={child.user_id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold v56-gradient-text tracking-tight flex items-center gap-2">
              <Network className="h-8 w-8 text-primary" />
              Advanced Referral Dashboard
            </h1>
            <p className="text-muted-foreground">Detailed network analysis and commission tracking</p>
          </div>
        </div>
        <Button onClick={exportToPDF} className="v56-primary-btn w-full md:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <Card className="v56-glass premium-border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Total Network
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{downline.length}</div>
            <p className="text-[10px] text-muted-foreground">Members across all levels</p>
          </CardContent>
        </Card>
        <Card className="v56-glass premium-border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Total Commissions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">
              {stats.reduce((acc, curr) => acc + Number(curr.total_commission), 0).toFixed(2)} USDT
            </div>
            <p className="text-[10px] text-muted-foreground">Lifetime referral earnings</p>
          </CardContent>
        </Card>
        <Card className="v56-glass premium-border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieChart className="h-4 w-4 text-orange-500" />
              Direct Referrals
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">
              {downline.filter(u => u.level === 1).length}
            </div>
            <p className="text-[10px] text-muted-foreground">Level 1 members</p>
          </CardContent>
        </Card>
        <Card className="v56-glass premium-border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              Active Levels
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">
              {new Set(downline.map(u => u.level)).size}
            </div>
            <p className="text-[10px] text-muted-foreground">Levels with active members</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[550px]">
          <TabsTrigger value="stats">Commission Stats</TabsTrigger>
          <TabsTrigger value="unlocking">Level Status</TabsTrigger>
          <TabsTrigger value="network">Network Tree</TabsTrigger>
        </TabsList>
        
        <TabsContent value="unlocking" className="space-y-6 pt-4">
          <TooltipProvider>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 15 }, (_, i) => i + 1).map((lvl) => {
                const enabled = isLevelEnabled(lvl);
                const target = getLevelTarget(lvl);
                const currentVolume = (profile as any)?.performance_usdt || 0; 
                const progress = target > 0 ? Math.min((currentVolume / target) * 100, 100) : 100;

                return (
                  <Tooltip key={lvl}>
                    <TooltipTrigger asChild>
                      <Card className={`v56-glass premium-border relative overflow-hidden transition-all duration-300 ${!enabled ? 'opacity-70 grayscale-[0.5] hover:grayscale-0' : 'hover:scale-[1.02] active:scale-[0.98]'}`}>
                        <div className={`absolute top-0 left-0 w-1 h-full ${enabled ? 'bg-primary' : 'bg-muted'}`} />
                        {!enabled && (
                          <div className="absolute top-2 right-2 p-1 rounded-full bg-black/40 border border-white/10">
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                        {enabled && (
                          <div className="absolute top-2 right-2 p-1 rounded-full bg-green-500/20 border border-green-500/30">
                            <ShieldCheck className="h-3 w-3 text-green-500" />
                          </div>
                        )}
                        <CardHeader className="p-4 pb-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-black p-1 rounded ${enabled ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>L{lvl}</span>
                              <CardTitle className="text-sm font-bold uppercase tracking-tight">Level Status</CardTitle>
                            </div>
                            <Badge variant={enabled ? 'default' : 'secondary'} className={enabled ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-muted text-muted-foreground'}>
                              {enabled ? 'Unlocked' : 'Locked'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-3">
                          <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                            <span>Requirement</span>
                            <span className="text-foreground">{target.toLocaleString()} USDT Volume</span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span className={enabled ? 'text-primary' : 'text-muted-foreground'}>Progress</span>
                              <span className="tabular-nums">{progress.toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-1000 ${enabled ? 'bg-primary shadow-glow' : 'bg-muted-foreground/30'}`} 
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            {!enabled && (
                              <p className="text-[9px] text-muted-foreground italic mt-1 font-medium">
                                Need {(target - currentVolume).toLocaleString()} USDT network volume to unlock.
                              </p>
                            )}
                            {enabled && (
                              <p className="text-[9px] text-green-500 font-bold flex items-center gap-1 mt-1">
                                <ShieldCheck className="h-2.5 w-2.5" />
                                Commission active for this level
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent className="v56-glass border-primary/20 p-3 max-w-[200px]">
                      <p className="text-xs font-bold mb-1">Level {lvl} Commissions</p>
                      <p className="text-[10px] text-muted-foreground">
                        {enabled 
                          ? `You are currently receiving commissions from Level ${lvl} referrals.`
                          : `Unlock this level by reaching ${target.toLocaleString()} USDT in total network investment volume.`}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
          <p className="text-xs text-muted-foreground text-center bg-primary/5 p-4 rounded-xl border border-primary/10">
            <strong>Platform Policy:</strong> Levels 1-4 are available to all active members. Levels 5-15 represent our <span className="text-primary font-bold">Elite Network Tiers</span>. Progress is calculated based on the total investment volume generated by your entire downline. Once a tier's target is achieved, it is permanently unlocked for your account.
          </p>
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <Card className="v56-glass premium-border">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Commission Distribution</CardTitle>
                <CardDescription>Earnings share by level</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={stats.filter(s => Number(s.total_commission) > 0)}
                      dataKey="total_commission"
                      nameKey="level"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                    >
                      {stats.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(var(--primary) / ${1 - index * 0.05})`} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: any) => [`${Number(value).toFixed(2)} USDT`, 'Commission']}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    />
                    <RechartsLegend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="v56-glass premium-border">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Network Member Growth</CardTitle>
                <CardDescription>Members count across 15 levels</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="level" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    />
                    <Bar dataKey="member_count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="v56-glass premium-border overflow-hidden mt-4">
            <CardHeader>
              <CardTitle>Level-wise Statistics</CardTitle>
              <CardDescription>Commission breakdown and member count for each level</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Level</TableHead>
                    <TableHead>Commission Rate</TableHead>
                    <TableHead className="text-center">Members</TableHead>
                    <TableHead className="text-right">Total Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-16 bg-muted" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12 bg-muted" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-8 mx-auto bg-muted" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20 ml-auto bg-muted" /></TableCell>
                      </TableRow>
                    ))
                  ) : stats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No commission data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    stats.map((stat) => (
                      <TableRow key={stat.level} className="hover:bg-accent/10">
                        <TableCell className="font-medium">Level {stat.level}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-none">
                            {(stat.commission_rate * 100).toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {stat.member_count}
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-500">
                          {Number(stat.total_commission).toFixed(2)} USDT
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="network" className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by username or email..." 
                className="pl-9 v56-glass"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full md:w-[200px] flex gap-2">
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="v56-glass">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {Array.from({ length: 15 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>Level {i + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="v56-glass premium-border min-h-[400px]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Network Tree</CardTitle>
                <CardDescription>Visual representation of your referral hierarchy</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportTreeAsImage} disabled={loading} className="h-8 text-[10px] font-bold uppercase tracking-wider">
                  <ImageIcon className="h-3 w-3 mr-1.5" />
                  PNG
                </Button>
                <Button variant="outline" size="sm" onClick={exportTreeAsPDF} disabled={loading} className="h-8 text-[10px] font-bold uppercase tracking-wider">
                  <Download className="h-3 w-3 mr-1.5" />
                  PDF
                </Button>
                <Button variant="outline" size="sm" onClick={handleShare} disabled={loading} className="h-8 text-[10px] font-bold uppercase tracking-wider">
                  <ShareIcon className="h-3 w-3 mr-1.5" />
                  Share
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-2 md:p-4">
              <div ref={treeRef} className="p-4 rounded-xl bg-background/5">
                {loading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full bg-muted rounded-lg" />
                    ))}
                  </div>
                ) : treeData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Network className="h-12 w-12 mb-4 opacity-20" />
                    <p>No members found in your network matching the filters.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {treeData.map(node => (
                      <TreeNode key={node.user_id} node={node} />
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
