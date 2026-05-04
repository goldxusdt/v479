import { ArrowDownToLine, TrendingUp, Users, Wallet, RefreshCcw, ArrowRightLeft, ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { getTransactions, getWalletBalances, swapWalletFunds } from '@/services/api';
import type { Transaction, WalletBalances } from '@/types';
import { toast } from 'sonner';

export default function WalletsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [swapping, setSwapping] = useState(false);
  
  // Internal Swap Form State
  const [swapSource, setSwapSource] = useState<'roi' | 'bonus'>('roi');
  const [swapAmount, setSwapAmount] = useState('');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const [balancesData, transactionsData] = await Promise.all([
        getWalletBalances(user.id),
        getTransactions(user.id, 20)
      ]);
      if (balancesData) setBalances(balancesData);
      if (transactionsData) setTransactions(transactionsData);
    } catch (error) {
      console.error('Failed to load wallet data:', error);
    }
  };

  const handleSwap = async (sourceWallet: string, amount: number) => {
    if (amount <= 0) {
      toast.error('Insufficient balance to swap');
      return;
    }
    
    if (!confirm(`Are you sure you want to swap ${amount.toFixed(2)} USDT from your ${sourceWallet.toUpperCase()} wallet to your Deposit wallet?`)) {
      return;
    }

    performSwap(sourceWallet, amount);
  };

  const handleFormSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(swapAmount);
    
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const availableBalance = balances?.[swapSource] || 0;
    if (amount > availableBalance) {
      toast.error(`Insufficient balance in ${swapSource.toUpperCase()} wallet`);
      return;
    }

    performSwap(swapSource, amount);
  };

  const performSwap = async (sourceWallet: string, amount: number) => {
    setSwapping(true);
    try {
      const { error } = await swapWalletFunds(sourceWallet, amount);
      if (error) {
        toast.error('Swap failed: ' + (error as any).message);
      } else {
        toast.success('Funds swapped successfully');
        setSwapAmount('');
        loadData();
      }
    } catch (err: unknown) {
      toast.error('Swap error: ' + (err as any).message);
    } finally {
      setSwapping(false);
    }
  };

  const walletData = [
    {
      title: 'Deposit Wallet',
      type: 'deposit',
      balance: balances?.deposit || 0,
      icon: Wallet,
      description: 'Available for investment',
      color: 'text-blue-500'
    },
    {
      title: 'Invested Capital',
      type: 'invested',
      balance: balances?.invested || 0,
      icon: TrendingUp,
      description: 'Currently working in plans',
      color: 'text-yellow-500'
    },
    {
      title: 'ROI Wallet',
      type: 'roi',
      balance: balances?.roi || 0,
      icon: TrendingUp,
      description: 'Monthly ROI earnings',
      color: 'text-green-500',
      canSwap: true
    },
    {
      title: 'Bonus Wallet',
      type: 'bonus',
      balance: balances?.bonus || 0,
      icon: Users,
      description: 'Referral commissions',
      color: 'text-purple-500',
      canSwap: true
    },
    {
      title: 'Withdrawal Wallet',
      type: 'withdrawal',
      balance: balances?.withdrawal || 0,
      icon: ArrowDownToLine,
      description: 'Processed withdrawals',
      color: 'text-orange-500'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold v56-gradient-text">My Wallets</h1>
          <p className="text-muted-foreground">Manage your wallet balances</p>
        </div>
      </div>

      {/* Net Total Portfolio Value */}
      <Card className="border-primary/20 card-glow gold-border">
        <CardHeader>
          <CardTitle>Net Total Portfolio Value</CardTitle>
          <CardDescription>Net equity after all fees and withdrawals</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold v56-gradient-text">{balances?.total?.toFixed(2) || '0.00'} USDT</p>
        </CardContent>
      </Card>

      {/* Individual Wallets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {walletData.map((wallet) => {
          const Icon = wallet.icon;
          return (
            <Card key={wallet.title} className="border-primary/20 card-glow hover:border-primary/40 transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{wallet.title}</CardTitle>
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className={`h-4 w-4 ${wallet.color}`} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-2xl font-bold text-primary">{wallet.balance.toFixed(2)} USDT</div>
                  <p className="text-xs text-muted-foreground mt-1">{wallet.description}</p>
                </div>
                
                {wallet.canSwap && wallet.balance > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-[10px] h-8 border-primary/30 hover:bg-primary/10 flex items-center justify-center gap-1"
                    onClick={() => handleSwap(wallet.type, wallet.balance)}
                    disabled={swapping}
                  >
                    <RefreshCcw className={`h-3 w-3 ${swapping ? 'animate-spin' : ''}`} />
                    Swap to Deposit
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Internal Transfers Section */}
      <Card className="border-primary/20 card-glow gold-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Internal Wallet Swap
          </CardTitle>
          <CardDescription>Transfer funds between your internal wallets</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFormSwap} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source-wallet">From (Source)</Label>
                <Select 
                  value={swapSource} 
                  onValueChange={(val: 'roi' | 'bonus') => setSwapSource(val)}
                >
                  <SelectTrigger id="source-wallet" className="bg-accent/30 h-12">
                    <SelectValue placeholder="Select source wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="roi">ROI Wallet ({balances?.roi?.toFixed(2) || '0.00'} USDT)</SelectItem>
                    <SelectItem value="bonus">Bonus Wallet ({balances?.bonus?.toFixed(2) || '0.00'} USDT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination-wallet">To (Destination)</Label>
                <div className="h-12 flex items-center px-3 rounded-md bg-muted/20 border border-white/5 text-muted-foreground font-medium">
                  Deposit Wallet
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="swap-amount">Amount (USDT)</Label>
                <div className="relative">
                  <Input
                    id="swap-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={swapAmount}
                    onChange={(e) => setSwapAmount(e.target.value)}
                    className="bg-accent/30 h-12 pr-16"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-primary hover:text-primary/80"
                    onClick={() => setSwapAmount((balances?.[swapSource] || 0).toString())}
                  >
                    Max
                  </button>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full premium-gradient h-12 rounded-xl font-black uppercase tracking-widest text-[10px]"
              disabled={swapping || !swapAmount || parseFloat(swapAmount) <= 0}
            >
              {swapping ? (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                  Processing Swap...
                </>
              ) : (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Confirm Swap to Deposit Wallet
                </>
              )}
            </Button>
            
            <p className="text-[10px] text-center text-muted-foreground uppercase font-bold tracking-widest opacity-60">
              Note: Swaps are instant and final. destination is always your Deposit Wallet.
            </p>
          </form>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button size="lg" className="" asChild>
          <Link to="/deposit">
            <ArrowDownToLine className="mr-2 h-5 w-5" />
            Deposit Funds
          </Link>
        </Button>
        <Button size="lg" variant="outline" className="border-primary/50 hover:bg-primary/10" asChild>
          <Link to="/withdrawal">
            <ArrowDownToLine className="mr-2 h-5 w-5 rotate-180" />
            Withdraw Funds
          </Link>
        </Button>
      </div>

      {/* Transaction History */}
      <Card className="border-primary/20 card-glow">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Recent wallet transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No transactions yet</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex justify-between items-center p-3 border border-primary/10 rounded-lg hover:border-primary/30 transition-all bg-accent/30"
                >
                  <div>
                    <p className="font-medium capitalize">{tx.transaction_type.replace('_', ' ')}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${tx.transaction_type.includes('deposit') || tx.transaction_type.includes('roi') || tx.transaction_type.includes('commission') ? 'text-green-500' : 'text-primary'}`}>
                      {tx.transaction_type.includes('withdrawal') ? '-' : '+'}{tx.amount.toFixed(2)} USDT
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{tx.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
