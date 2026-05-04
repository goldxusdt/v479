import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  ArrowLeft, 
  XCircle,
  Clock,
  Download,
  MoreHorizontal,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from '@/services/supabase';
import { format } from 'date-fns';
import { exportToCSV } from '@/utils/csv-export';

export default function CouponHistoryPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadCouponHistory();
  }, []);

  const loadCouponHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (error) {
      console.error('Failed to load coupon history:', error);
      toast.error('Failed to load coupon history');
    } finally {
      setLoading(false);
    }
  };

  const filteredCoupons = coupons.filter(coupon => {
    const matchesSearch = coupon.code.toLowerCase().includes(searchTerm.toLowerCase());
    const isExpired = coupon.expiry_date && new Date(coupon.expiry_date) < new Date();
    
    let status = 'active';
    if (coupon.is_auto_deleted) status = 'auto_deleted';
    else if (!coupon.is_active) status = 'inactive';
    else if (isExpired) status = 'expired';

    const matchesStatus = statusFilter === 'all' || statusFilter === status;
    return matchesSearch && matchesStatus;
  });

  const handleExport = () => {
    const exportData = filteredCoupons.map(c => ({
      'Code': c.code,
      'Type': c.discount_type,
      'Value': c.discount_value,
      'Status': c.is_auto_deleted ? 'Auto-Deleted' : (c.is_active ? 'Active' : 'Inactive'),
      'Redemptions': c.used_count,
      'Total Savings': c.total_savings || 0,
      'Created At': format(new Date(c.created_at), 'yyyy-MM-dd'),
      'Expiry Date': c.expiry_date ? format(new Date(c.expiry_date), 'yyyy-MM-dd') : 'Never',
      'Reason': c.deletion_reason || '-'
    }));
    exportToCSV(exportData, 'coupon_history');
    toast.success('History exported successfully');
  };

  const getStatusBadge = (coupon: any) => {
    const isExpired = coupon.expiry_date && new Date(coupon.expiry_date) < new Date();
    
    if (coupon.is_auto_deleted) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Auto-Deleted
        </Badge>
      );
    }
    if (!coupon.is_active) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Inactive
        </Badge>
      );
    }
    if (isExpired) {
      return (
        <Badge variant="outline" className="text-orange-500 border-orange-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Expired
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="bg-green-500 hover:bg-green-600 flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Active
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/coupons')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold v56-gradient-text">Coupon History</h1>
            <p className="text-muted-foreground">Historical records of all generated coupons</p>
          </div>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Export History
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search coupon code..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive Only</SelectItem>
              <SelectItem value="expired">Expired Only</SelectItem>
              <SelectItem value="auto_deleted">Auto-Deleted Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Card className="v56-glass premium-border py-2 px-4 flex items-center justify-between">
          <div className="text-xs font-bold text-muted-foreground uppercase">Total Coupons</div>
          <div className="text-xl font-bold">{coupons.length}</div>
        </Card>
      </div>

      <Card className="v56-glass premium-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Coupon Code</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Redemptions</TableHead>
                <TableHead>Total Savings</TableHead>
                <TableHead>ROI Balance (at Del)</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">Loading history...</TableCell>
                </TableRow>
              ) : filteredCoupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">No matching coupons found.</TableCell>
                </TableRow>
              ) : (
                filteredCoupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-bold font-mono">{coupon.code}</TableCell>
                    <TableCell>
                      {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `${coupon.discount_value} USDT`}
                    </TableCell>
                    <TableCell className="capitalize">{coupon.redemption_type}s</TableCell>
                    <TableCell>{getStatusBadge(coupon)}</TableCell>
                    <TableCell className="font-mono">{coupon.used_count}</TableCell>
                    <TableCell className="font-bold text-green-500">${Number(coupon.total_savings || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      {coupon.roi_balance_at_deletion !== null ? (
                        <span className="font-bold text-primary">${Number(coupon.roi_balance_at_deletion).toFixed(2)}</span>
                      ) : (
                        <span className="text-muted-foreground italic text-xs">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {coupon.expiry_date ? format(new Date(coupon.expiry_date), 'MMM dd, yyyy') : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/admin/coupons`)}>
                            Manage Coupons
                          </DropdownMenuItem>
                          {coupon.is_auto_deleted && (
                            <DropdownMenuItem className="text-muted-foreground italic">
                              Reason: {coupon.deletion_reason || 'Expired'}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
