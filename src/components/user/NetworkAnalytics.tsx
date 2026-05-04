import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  ChevronRight, 
  ShieldCheck, 
  BarChart3,
  Network,
  Loader2,
  MoreHorizontal,
  Mail,
  User,
  ExternalLink,
  Calendar
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { getDownlineSummary, getDownlineByLevel } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DownlineSummaryItem } from '@/types';

export function NetworkAnalytics() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DownlineSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [levelUsers, setLevelUsers] = useState<any[]>([]);
  const [levelLoading, setLevelLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadDownline();
    }
  }, [user]);

  const loadDownline = async () => {
    try {
      const data = await getDownlineSummary(user!.id);
      setSummary(data);
    } catch (error) {
      console.error('Failed to load downline analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewLevelDetails = async (level: number) => {
    setSelectedLevel(level);
    setLevelLoading(true);
    try {
      const data = await getDownlineByLevel(user!.id, level);
      setLevelUsers(data || []);
    } catch (error) {
      console.error('Failed to load level users:', error);
    } finally {
      setLevelLoading(false);
    }
  };

  const totalMembers = summary.reduce((sum, item) => sum + item.member_count, 0);
  const totalActive = summary.reduce((sum, item) => sum + item.active_count, 0);
  const totalVolume = summary.reduce((sum, item) => sum + item.total_volume, 0);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 bg-muted rounded-2xl" />)}
        </div>
        <Skeleton className="h-96 w-full bg-muted rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="v56-glass premium-border bg-primary/5">
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-[0.2em] font-black text-[10px]">Total Network Size</CardDescription>
            <CardTitle className="text-4xl font-black text-primary">{totalMembers.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <Users className="h-3 w-3" />
              Across all 15 levels
            </div>
          </CardContent>
        </Card>

        <Card className="v56-glass premium-border bg-green-500/5">
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-[0.2em] font-black text-[10px]">Active Members</CardDescription>
            <CardTitle className="text-4xl font-black text-green-500">{totalActive.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <ShieldCheck className="h-3 w-3" />
              KYC Approved Partners
            </div>
          </CardContent>
        </Card>

        <Card className="v56-glass premium-border bg-blue-500/5">
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-[0.2em] font-black text-[10px]">Network Volume</CardDescription>
            <CardTitle className="text-4xl font-black text-blue-400">${totalVolume.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <BarChart3 className="h-3 w-3" />
              Total USDT Deposited
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Level by Level Breakdown */}
      <Card className="v56-glass premium-border overflow-hidden">
        <CardHeader className="border-b border-white/5 pb-6">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            <CardTitle>15-Tier Breakdown</CardTitle>
          </div>
          <CardDescription>Performance distribution across your network levels</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-primary/5 text-primary border-b border-primary/10">
                <tr>
                  <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">Level</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">Members</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">Active (KYC)</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">Volume</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">Contribution</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {summary.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      No network data found. Start building your team!
                    </td>
                  </tr>
                ) : (
                  summary.map((item) => (
                    <tr key={item.level} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary font-bold">
                          L{item.level}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-bold">{item.member_count.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-green-500">{item.active_count.toLocaleString()}</span>
                          <span className="text-[10px] text-muted-foreground">({Math.round((item.active_count / (item.member_count || 1)) * 100)}%)</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-blue-400">
                        ${item.total_volume.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary" 
                            style={{ width: `${(item.total_volume / (totalVolume || 1)) * 100}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleViewLevelDetails(item.level)}
                          className="text-muted-foreground hover:text-primary transition-colors p-2 hover:bg-primary/10 rounded-full"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Level Details Dialog */}
      <Dialog open={selectedLevel !== null} onOpenChange={(open) => !open && setSelectedLevel(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0a0b1e]/95 backdrop-blur-3xl border border-primary/20 rounded-[2.5rem] p-0 shadow-2xl shadow-primary/10">
          <div className="p-8 space-y-8">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <DialogTitle className="flex items-center gap-2 text-3xl font-black italic tracking-tighter">
                    <Users className="h-8 w-8 text-primary" />
                    Level {selectedLevel} <span className="text-primary">Network</span>
                  </DialogTitle>
                  <DialogDescription className="uppercase font-bold text-[10px] tracking-[0.2em] text-muted-foreground">
                    Direct and indirect partners at this depth
                  </DialogDescription>
                </div>
                <div className="hidden sm:block">
                  <Badge variant="outline" className="h-10 px-6 rounded-xl bg-primary/5 border-primary/20 text-primary font-black uppercase tracking-widest text-xs">
                    {levelUsers.length} Partners
                  </Badge>
                </div>
              </div>
            </DialogHeader>

            {levelLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Syncing Network Data...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-[2rem] border border-white/5 overflow-hidden bg-black/20">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-primary/5">
                        <TableRow className="border-white/5 hover:bg-transparent">
                          <TableHead className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-primary">Partner</TableHead>
                          <TableHead className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-primary">Contact Info</TableHead>
                          <TableHead className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-primary">Joining Details</TableHead>
                          <TableHead className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-primary text-right">Verification</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {levelUsers.length === 0 ? (
                          <TableRow>
                            <td colSpan={4} className="h-48 text-center text-muted-foreground italic font-medium">
                              <div className="flex flex-col items-center gap-3">
                                <Users className="h-8 w-8 opacity-20" />
                                <p>No partners found in this specific tier yet.</p>
                              </div>
                            </td>
                          </TableRow>
                        ) : (
                          levelUsers.map((u) => (
                            <TableRow key={u.user_id} className="border-white/5 hover:bg-white/5 transition-colors group">
                              <TableCell className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                                    <User className="h-4 w-4 text-primary" />
                                  </div>
                                  <span className="font-bold text-sm">{u.username || 'Anonymous'}</span>
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-4 text-xs text-muted-foreground">{u.email}</TableCell>
                              <TableCell className="px-6 py-4">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(u.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-3">
                                  {u.kyc_status === 'approved' ? (
                                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20 font-black text-[10px] uppercase tracking-widest h-6">Active</Badge>
                                  ) : (
                                    <Badge variant="outline" className="opacity-50 font-black text-[10px] uppercase tracking-widest h-6">Pending</Badge>
                                  )}
                                  
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/20">
                                        <MoreHorizontal className="h-4 w-4 text-primary" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="v56-glass premium-border rounded-xl">
                                      <DropdownMenuLabel className="text-[10px] uppercase font-black tracking-widest opacity-50">Partner Actions</DropdownMenuLabel>
                                      <DropdownMenuSeparator className="bg-white/5" />
                                      <DropdownMenuItem onClick={() => window.location.href = `mailto:${u.email}`} className="cursor-pointer">
                                        <Mail className="mr-2 h-4 w-4" /> Send Message
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="cursor-pointer">
                                        <ExternalLink className="mr-2 h-4 w-4" /> Track Performance
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
