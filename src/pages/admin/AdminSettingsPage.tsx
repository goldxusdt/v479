import { Globe, Loader2, Mail, Save, Terminal, Users, Wallet, Zap, TrendingUp, DollarSign, Activity, Anchor, Shield, AlertCircle, Clock, ShieldAlert, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { bulkSyncReferralTargets } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSettings } from '@/contexts/SettingsContext';
import { supabase } from '@/services/supabase';

import { ROIAdjustmentManager } from '@/components/admin/ROIAdjustmentManager';
import { SMTPSettingsManager } from '@/components/admin/SMTPSettingsManager';
import { BrandingManager } from '@/components/admin/BrandingManager';

export default function AdminSettingsPage() {
  const { refreshSettings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    // Platform Core
    deposit_wallet_bep20: '',
    deposit_wallet_trc20: '',
    min_deposit: '100',
    min_withdrawal: '50',
    deposit_fee: '5',
    withdrawal_fee: '5',
    monthly_roi: '10',
    daily_roi_percentage: '0.33',
    target_usdt: '1000',
    is_referral_default: 'true',
    level1_commission: '8',
    level2_commission: '4',
    level3_commission: '2',
    level4_commission: '1',
    // ... Levels 5-15 (will map dynamically)
    global_auto_withdrawal_enabled: 'false',
    
    // External APIs
    bscscan_api_key: '',
    tronscan_api_key: '',
    
    // Branding & Assets
    site_title: 'Gold X Usdt',
    site_tagline: 'The Gold Standard of Digital Wealth',
    logo_header_url: '',
    logo_footer_url: '',
    favicon_url: '',
    primary_color: '#D4AF37',
    secondary_color: '#1A1A1A',
    accent_color: '#FFD700',
    font_family: 'Inter',
    
    // SEO & Meta
    seo_description: '',
    seo_keywords: '',
    og_title: '',
    og_description: '',
    og_image: '',
    twitter_card: 'summary_large_image',
    robots_txt: '',
    
    // Contact & Social
    contact_email: '',
    contact_phone: '',
    contact_address: '',
    social_facebook: '',
    social_twitter: '',
    social_instagram: '',
    social_telegram: '',
    
    // Analytics & Scripts
    ga_measurement_id: '',
    analytics_code: '',
    header_scripts: '',
    footer_scripts: '',
    
    // Hostinger SMTP (Updated)
    smtp_user: '',
    smtp_pass: '',
    smtp_host: 'smtp.hostinger.com',
    smtp_port: '465',
    
    // Help Links
    youtube_deposit_help: '',
    youtube_kyc_help: '',
    youtube_withdrawal_help: '',

    // Security & Firewall
    firewall_geo_blocking_enabled: 'false',
    firewall_geo_blacklist: '[]',
    firewall_rate_limiting_enabled: 'true',
    firewall_rate_limit_max_requests: '100',
    firewall_rate_limit_window_seconds: '60',
    firewall_maintenance_mode: 'false',
    admin_session_timeout: '30',

    // Browser Notifications (VAPID)
    vapid_public_key: '',
    vapid_private_key: '',
    vapid_subject: 'mailto:info@goldxusdt.com',

    // Blockchain API auto-confirmation
    blockchain_api_trc20_key: '',
    blockchain_api_bep20_key: '',
    blockchain_trc20_wallet: '',
    blockchain_bep20_wallet: '',
    
    // Compliance Export
    compliance_email: 'reports@goldxusdt.com',
    compliance_org_name: 'GoldX USDT',

    withdrawal_cycle_duration_hours: '360',
    first_deposit_cooling_period_hours: '48',
    withdrawal_cooling_period_default: '48',

    // Levels 5-15 (will map dynamically)
    ...Array.from({ length: 11 }, (_, i) => ({ 
      [`level${i + 5}_commission`]: ['0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8', '0.9', '1.0', '4.0'][i],
      [`level${i + 5}_target`]: ['10000', '25000', '50000', '75000', '100000', '150000', '200000', '300000', '400000', '500000', '1000000'][i]
    })).reduce((acc, curr) => ({ ...acc, ...curr }), {})
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value');

      if (error) throw error;

      const settingsObj: any = { ...settings };
      (data || []).forEach((setting: any) => {
        if (setting.key in settingsObj || setting.key.startsWith('level')) {
          settingsObj[setting.key] = setting.value;
        }
      });
      setSettings(settingsObj);
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({
        key,
        value: value ? value.toString() : ''
      }));

      const { error } = await supabase
        .from('settings')
        .upsert(updates as any, { onConflict: 'key' });

      if (error) throw error;

      toast.success('Settings saved successfully');
      await refreshSettings();
      
      // Update CSS variables for live preview
      if (settings.primary_color) {
        document.documentElement.style.setProperty('--primary', settings.primary_color);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      
      // Auto-calculate daily ROI if monthly ROI changes
      if (key === 'monthly_roi' && !isNaN(Number(value))) {
        newSettings.daily_roi_percentage = (Number(value) / 30).toFixed(2);
      }
      
      return newSettings;
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-10 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-4xl font-black v56-gradient-text tracking-tight leading-tight">
            System <span className="text-foreground">Configuration</span>
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary" />
            Global Command & Core Platform Configuration
          </p>
        </div>
        <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto h-12 rounded-xl font-bold uppercase tracking-widest px-8">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Apply Global Changes
        </Button>
      </div>
      <Tabs defaultValue="platform" className="w-full space-y-8">
        <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
          <TabsList className="inline-flex h-12 items-center justify-start rounded-xl bg-muted/50 p-1 text-muted-foreground w-max sm:w-full sm:grid sm:grid-cols-4 lg:grid-cols-8 border border-white/5">
            <TabsTrigger value="platform" className="rounded-lg h-10 px-6 font-bold uppercase tracking-widest text-[10px]">Platform Core</TabsTrigger>
            <TabsTrigger value="blockchain" className="rounded-lg h-10 px-6 font-bold uppercase tracking-widest text-[10px]">Blockchain API</TabsTrigger>
            <TabsTrigger value="branding" className="rounded-lg h-10 px-6 font-bold uppercase tracking-widest text-[10px]">Branding & Assets</TabsTrigger>
            <TabsTrigger value="roi-adjustments" className="rounded-lg h-10 px-6 font-bold uppercase tracking-widest text-[10px]">ROI Adjustments</TabsTrigger>
            <TabsTrigger value="seo" className="rounded-lg h-10 px-6 font-bold uppercase tracking-widest text-[10px]">SEO & Analytics</TabsTrigger>
            <TabsTrigger value="content" className="rounded-lg h-10 px-6 font-bold uppercase tracking-widest text-[10px]">Content & Contact</TabsTrigger>
            <TabsTrigger value="operations" className="rounded-lg h-10 px-6 font-bold uppercase tracking-widest text-[10px]">Operations</TabsTrigger>
            <TabsTrigger value="security" className="rounded-lg h-10 px-6 font-bold uppercase tracking-widest text-[10px]">Security</TabsTrigger>
          </TabsList>
        </div>

        {/* Platform Core Tab */}
        <TabsContent value="platform" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Wallet Addresses */}
            <Card className="v56-glass premium-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  <CardTitle>Crypto Wallets</CardTitle>
                </div>
                <CardDescription>Deposit receiving addresses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>BEP-20 Wallet Address</Label>
                  <Textarea
                    value={settings.deposit_wallet_bep20}
                    onChange={(e) => updateSetting('deposit_wallet_bep20', e.target.value)}
                    rows={2}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label>TRC-20 Wallet Address</Label>
                  <Textarea
                    value={settings.deposit_wallet_trc20}
                    onChange={(e) => updateSetting('deposit_wallet_trc20', e.target.value)}
                    rows={2}
                    className="font-mono text-xs"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Transaction Limits */}
            <Card className="v56-glass premium-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <CardTitle>Financial Limits</CardTitle>
                </div>
                <CardDescription>Minimums and fees</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Min Deposit (USDT)</Label>
                    <Input
                      type="number"
                      value={settings.min_deposit}
                      onChange={(e) => updateSetting('min_deposit', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Min Withdrawal (USDT)</Label>
                    <Input
                      type="number"
                      value={settings.min_withdrawal}
                      onChange={(e) => updateSetting('min_withdrawal', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Deposit Fee (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={settings.deposit_fee}
                      onChange={(e) => updateSetting('deposit_fee', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Withdrawal Fee (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={settings.withdrawal_fee}
                      onChange={(e) => updateSetting('withdrawal_fee', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ROI Settings */}
            <Card className="v56-glass premium-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <CardTitle>ROI Configuration</CardTitle>
                </div>
                <CardDescription>Investment returns settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Monthly ROI (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={settings.monthly_roi}
                      disabled={settings.is_referral_default === 'true'}
                      onChange={(e) => {
                        const monthly = e.target.value;
                        const daily = (parseFloat(monthly) / 30).toFixed(4);
                        updateSetting('monthly_roi', monthly);
                        updateSetting('daily_roi_percentage', daily);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Daily ROI (%) [Auto]</Label>
                    <Input
                      type="number"
                      value={settings.daily_roi_percentage}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Target USDT (Projection)</Label>
                    <Input
                      type="number"
                      value={(settings as any).target_usdt}
                      disabled={settings.is_referral_default === 'true'}
                      onChange={(e) => updateSetting('target_usdt', e.target.value)}
                      placeholder="Enter target USDT for projections"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SMTP Settings Component */}
            <SMTPSettingsManager 
              settings={settings} 
              updateSetting={updateSetting} 
            />
          </div>

          {/* Referral Commission */}
          <Card className="v56-glass premium-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>Referral Commission Structure</CardTitle>
              </div>
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                <Label htmlFor="default-commission" className="text-xs font-bold uppercase tracking-widest cursor-pointer">Default (5.2.2)</Label>
                <Switch 
                  id="default-commission"
                  checked={settings.is_referral_default === 'true'}
                  onCheckedChange={ (checked: boolean) => {
                    const isDefault = checked ? 'true' : 'false';
                    const newSettings = { ...settings, is_referral_default: isDefault };
                    
                    if (checked) {
                      // Apply default values
                      newSettings.monthly_roi = '10';
                      newSettings.daily_roi_percentage = '0.33';
                      (newSettings as any).target_usdt = '1000';
                      newSettings.level1_commission = '8';
                      newSettings.level2_commission = '4';
                      newSettings.level3_commission = '2';
                      newSettings.level4_commission = '1';
                      
                      const levelDefaults = [
                        { comm: '0.1', target: '10000' }, // L5
                        { comm: '0.2', target: '25000' }, // L6
                        { comm: '0.3', target: '50000' }, // L7
                        { comm: '0.4', target: '75000' }, // L8
                        { comm: '0.5', target: '100000' }, // L9
                        { comm: '0.6', target: '150000' }, // L10
                        { comm: '0.7', target: '200000' }, // L11
                        { comm: '0.8', target: '300000' }, // L12
                        { comm: '0.9', target: '400000' }, // L13
                        { comm: '1.0', target: '500000' }, // L14
                        { comm: '4.0', target: '1000000' } // L15
                      ];

                      for (let i = 0; i < 11; i++) {
                        const levelNum = i + 5;
                        (newSettings as any)[`level${levelNum}_commission`] = levelDefaults[i].comm;
                        (newSettings as any)[`level${levelNum}_target`] = levelDefaults[i].target;
                      }
                    }
                    setSettings(newSettings);
                  }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((level) => (
                  <div key={level} className="space-y-2 p-3 rounded-lg border border-white/5 bg-white/5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-primary">Level {level} (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={(settings as any)[`level${level}_commission`]}
                      onChange={(e) => updateSetting(`level${level}_commission`, e.target.value)}
                      disabled={settings.is_referral_default === 'true'}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>

              <div className="h-px bg-white/5" />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Premium Unlocks (L5-L15)</h4>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-[10px] font-black uppercase tracking-widest bg-primary/10 border-primary/20 hover:bg-primary/20"
                  onClick={async () => {
                    const confirmMessage = "Are you sure you want to sync these unlock targets to ALL active user profiles? This will overwrite any individual overrides.";
                    if (window.confirm(confirmMessage)) {
                      try {
                        const loadingToast = toast.loading("Syncing targets...");
                        const result = await bulkSyncReferralTargets();
                        toast.dismiss(loadingToast);
                        toast.success(`Successfully synced targets to ${result.updated_count} users!`);
                      } catch (err: unknown) {
                        toast.error((err as any).message || "Sync failed");
                      }
                    }
                  }}
                >
                  <Zap className="h-3 w-3 mr-2" />
                  Bulk Sync Targets
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 11 }, (_, i) => i + 5).map((level) => (
                  <div key={level} className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-white/5 bg-white/5">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-wider">Level {level} (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={(settings as any)[`level${level}_commission`]}
                        onChange={(e) => updateSetting(`level${level}_commission`, e.target.value)}
                        disabled={settings.is_referral_default === 'true'}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-wider">L{level} Target (USDT)</Label>
                      <Input
                        type="number"
                        value={(settings as any)[`level${level}_target`]}
                        onChange={(e) => updateSetting(`level${level}_target`, e.target.value)}
                        disabled={settings.is_referral_default === 'true'}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Blockchain API Tab */}
        <TabsContent value="blockchain" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* TRC-20 (Tron) API */}
            <Card className="v56-glass premium-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-primary" />
                  <CardTitle>TRC-20 API Configuration</CardTitle>
                </div>
                <CardDescription>TronScan or Tatum API for auto-confirmation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tron API Key</Label>
                  <Input
                    type="password"
                    value={settings.blockchain_api_trc20_key}
                    onChange={(e) => updateSetting('blockchain_api_trc20_key', e.target.value)}
                    placeholder="Enter TronScan/Tatum API Key"
                  />
                </div>
                <div className="space-y-2">
                  <Label>System TRC-20 Wallet</Label>
                  <Input
                    value={settings.blockchain_trc20_wallet}
                    onChange={(e) => updateSetting('blockchain_trc20_wallet', e.target.value)}
                    placeholder="T..."
                  />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Address to monitor for incoming TRC-20 transfers</p>
                </div>
              </CardContent>
            </Card>

            {/* BEP-20 (BSC) API */}
            <Card className="v56-glass premium-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-primary" />
                  <CardTitle>BEP-20 API Configuration</CardTitle>
                </div>
                <CardDescription>BscScan or Moralis API for auto-confirmation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>BSC API Key</Label>
                  <Input
                    type="password"
                    value={settings.blockchain_api_bep20_key}
                    onChange={(e) => updateSetting('blockchain_api_bep20_key', e.target.value)}
                    placeholder="Enter BscScan/Moralis API Key"
                  />
                </div>
                <div className="space-y-2">
                  <Label>System BEP-20 Wallet</Label>
                  <Input
                    value={settings.blockchain_bep20_wallet}
                    onChange={(e) => updateSetting('blockchain_bep20_wallet', e.target.value)}
                    placeholder="0x..."
                  />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Address to monitor for incoming BEP-20 transfers</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Branding & Assets Tab */}
        <TabsContent value="branding" className="space-y-6 mt-6">
          <BrandingManager settings={settings} updateSetting={updateSetting} />
        </TabsContent>


        {/* SEO & Analytics Tab */}
        <TabsContent value="roi-adjustments" className="space-y-6 mt-6">
          <ROIAdjustmentManager />
        </TabsContent>

        <TabsContent value="seo" className="space-y-6 mt-6">
          <BrandingManager settings={settings} updateSetting={updateSetting} />
        </TabsContent>

        {/* Content & Contact Tab */}
        <TabsContent value="content" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="v56-glass premium-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <CardTitle>Contact Information</CardTitle>
                </div>
                <CardDescription>Publicly displayed contact details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input
                    type="email"
                    value={settings.contact_email}
                    onChange={(e) => updateSetting('contact_email', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Phone</Label>
                  <Input
                    value={settings.contact_phone}
                    onChange={(e) => updateSetting('contact_phone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea
                    value={settings.contact_address}
                    onChange={(e) => updateSetting('contact_address', e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="v56-glass premium-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  <CardTitle>Social Media Links</CardTitle>
                </div>
                <CardDescription>Connect with your community</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Facebook URL</Label>
                  <Input
                    value={settings.social_facebook}
                    onChange={(e) => updateSetting('social_facebook', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Twitter/X URL</Label>
                  <Input
                    value={settings.social_twitter}
                    onChange={(e) => updateSetting('social_twitter', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Instagram URL</Label>
                  <Input
                    value={settings.social_instagram}
                    onChange={(e) => updateSetting('social_instagram', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telegram Channel</Label>
                  <Input
                    value={settings.social_telegram}
                    onChange={(e) => updateSetting('social_telegram', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="v56-glass premium-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Anchor className="h-5 w-5 text-primary" />
                  <CardTitle>Help Resources</CardTitle>
                </div>
                <CardDescription>YouTube video links for tutorials</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Deposit Help Video URL</Label>
                  <Input
                    value={settings.youtube_deposit_help}
                    onChange={(e) => updateSetting('youtube_deposit_help', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>KYC Help Video URL</Label>
                  <Input
                    value={settings.youtube_kyc_help}
                    onChange={(e) => updateSetting('youtube_kyc_help', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Withdrawal Help Video URL</Label>
                  <Input
                    value={settings.youtube_withdrawal_help}
                    onChange={(e) => updateSetting('youtube_withdrawal_help', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Operations Tab */}
        <TabsContent value="operations" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="v56-glass premium-border border-red-500/20 bg-red-500/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-red-500" />
                  <CardTitle>System Maintenance</CardTitle>
                </div>
                <CardDescription>Critical system-wide maintenance actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
                  <h4 className="font-bold text-sm text-red-400">Clear Activity Logs</h4>
                  <p className="text-xs text-muted-foreground">
                    Archive or clear activity logs older than 90 days to maintain performance.
                  </p>
                  <Button variant="destructive" className="w-full h-12 rounded-xl opacity-50 cursor-not-allowed">
                    Archive Old Logs
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security & Firewall Tab */}
        <TabsContent value="security" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="v56-glass premium-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle>Global Firewall Configuration</CardTitle>
                </div>
                <CardDescription>Advanced access control and security hardening</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-xl bg-primary/5">
                  <div className="space-y-0.5">
                    <Label className="text-base font-bold text-red-500 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Maintenance Mode
                    </Label>
                    <p className="text-sm text-muted-foreground">When active, only admins can access the platform</p>
                  </div>
                  <Switch
                    checked={settings.firewall_maintenance_mode === 'true'}
                    onCheckedChange={ (checked: boolean) => updateSetting('firewall_maintenance_mode', checked.toString())}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base font-bold">Geo-Blocking (WAF)</Label>
                      <p className="text-sm text-muted-foreground">Block traffic from high-risk countries</p>
                    </div>
                    <Switch
                      checked={settings.firewall_geo_blocking_enabled === 'true'}
                      onCheckedChange={ (checked: boolean) => updateSetting('firewall_geo_blocking_enabled', checked.toString())}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Blacklisted Country Codes (JSON Array)</Label>
                    <Input
                      placeholder='["CN", "RU", "IR"]'
                      value={settings.firewall_geo_blacklist}
                      onChange={(e) => updateSetting('firewall_geo_blacklist', e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base font-bold">Rate Limiting (IPS)</Label>
                      <p className="text-sm text-muted-foreground">Prevent DDoS and brute force attacks</p>
                    </div>
                    <Switch
                      checked={settings.firewall_rate_limiting_enabled === 'true'}
                      onCheckedChange={ (checked: boolean) => updateSetting('firewall_rate_limiting_enabled', checked.toString())}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Max Requests</Label>
                      <Input
                        type="number"
                        value={settings.firewall_rate_limit_max_requests}
                        onChange={(e) => updateSetting('firewall_rate_limit_max_requests', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Window (Seconds)</Label>
                      <Input
                        type="number"
                        value={settings.firewall_rate_limit_window_seconds}
                        onChange={(e) => updateSetting('firewall_rate_limit_window_seconds', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="v56-glass premium-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <CardTitle>Audit & Monitoring</CardTitle>
                </div>
                <CardDescription>Continuous security review and logging</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="p-4 border rounded-xl bg-primary/5 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-base font-bold flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        Admin Session Timeout
                      </Label>
                      <p className="text-sm text-muted-foreground">Inactivity duration before automatic logout (minutes)</p>
                      <Select
                        value={settings.admin_session_timeout}
                        onValueChange={(value) => updateSetting('admin_session_timeout', value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select timeout" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 Minutes</SelectItem>
                          <SelectItem value="30">30 Minutes (Default)</SelectItem>
                          <SelectItem value="60">60 Minutes</SelectItem>
                          <SelectItem value="120">2 Hours</SelectItem>
                          <SelectItem value="240">4 Hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-4">
                    <Label className="text-base font-bold flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-primary" />
                      Compliance Export Configuration
                    </Label>
                    <p className="text-sm text-muted-foreground">Configure details for secure audit reports</p>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Compliance Reporting Email</Label>
                        <Input
                          value={settings.compliance_email}
                          onChange={(e) => updateSetting('compliance_email', e.target.value)}
                          placeholder="reports@goldxusdt.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Organization Name</Label>
                        <Input
                          value={settings.compliance_org_name}
                          onChange={(e) => updateSetting('compliance_org_name', e.target.value)}
                          placeholder="GoldX USDT"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* VAPID Card */}
            <Card className="v56-glass premium-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <CardTitle>Browser Push Notifications (VAPID)</CardTitle>
                </div>
                <CardDescription>Configure keys for web push notification service</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>VAPID Public Key</Label>
                  <Textarea
                    value={settings.vapid_public_key}
                    onChange={(e) => updateSetting('vapid_public_key', e.target.value)}
                    rows={3}
                    className="font-mono text-xs"
                    placeholder="Base64URL encoded public key"
                  />
                </div>
                <div className="space-y-2">
                  <Label>VAPID Private Key</Label>
                  <Textarea
                    value={settings.vapid_private_key}
                    onChange={(e) => updateSetting('vapid_private_key', e.target.value)}
                    rows={3}
                    className="font-mono text-xs"
                    placeholder="Base64URL encoded private key"
                  />
                </div>
                <div className="space-y-2">
                  <Label>VAPID Subject (mailto or url)</Label>
                  <Input
                    value={settings.vapid_subject}
                    onChange={(e) => updateSetting('vapid_subject', e.target.value)}
                    placeholder="mailto:admin@example.com"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="v56-glass premium-border">
              <CardContent className="pt-6">
                <div className="p-4 border rounded-xl bg-primary/5 space-y-2">
                  <h4 className="font-bold flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Data Protection Status
                  </h4>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Row Level Security (RLS) is active on all tables</li>
                    <li>Sensitive columns are protected via strict SELECT policies</li>
                    <li>Encryption-at-rest provided by Supabase (AES-256)</li>
                    <li>SSL/TLS 1.3 enforced for all network traffic</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>



      </Tabs>
    </div>
  );
}
