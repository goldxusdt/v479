import { Bell, Send, History, Layout, Plus, Loader2, Trash2, CheckCircle2, AlertCircle, Monitor, Settings, Smartphone, Undo2, Tag, Edit2, Save, FileSpreadsheet } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from '@/services/supabase';
import { toast } from 'sonner';
import { format, differenceInMinutes } from 'date-fns';
import { SEOHead } from '@/utils/seo';
import { invokeEdgeFunction } from '@/services/functions';
import { NotificationPreview } from '@/components/notifications/NotificationPreview';

import type { NotificationHistory, NotificationTemplate, NotificationCategory } from '@/types';
import { cn } from '@/utils/utils';
import { useAuth } from '@/contexts/AuthContext';

export default function NotificationManagementPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [systemNotifications, setSystemNotifications] = useState<any[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [categories, setCategories] = useState<NotificationCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [activeTab, setActiveTab] = useState('compose');
  const [previewType, setPreviewType] = useState<'mobile' | 'desktop'>('mobile');
  const [recallWindowMinutes, setRecallWindowMinutes] = useState(5);

  const [notification, setNotification] = useState({
    title: '',
    body: '',
    target_type: 'all',
    target_id: '',
    action_url: '',
    icon_url: '',
    category_id: ''
  });

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    title: '',
    body: '',
    category: 'announcement',
    category_id: ''
  });

  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    color: '#BF953F'
  });

  const [editingCategory, setEditingCategory] = useState<NotificationCategory | null>(null);

  useEffect(() => {
    loadData();
    loadRecallWindow();

    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 8000);
    
    return () => clearTimeout(safetyTimeout);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [historyRes, templatesRes, categoriesRes, systemRes] = await Promise.all([
        supabase.from('notification_history').select('*, notification_categories(*)').order('sent_at', { ascending: false }),
        supabase.from('notification_templates').select('*').order('created_at', { ascending: false }),
        supabase.from('notification_categories').select('*').order('created_at', { ascending: true }),
        supabase.from('notifications').select('*, profiles(email, full_name)').order('created_at', { ascending: false }).limit(100)
      ]);

      if (historyRes.error) throw historyRes.error;
      if (templatesRes.error) throw templatesRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (systemRes.error) throw systemRes.error;

      setHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
      setTemplates(Array.isArray(templatesRes.data) ? templatesRes.data : []);
      setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : []);
      setSystemNotifications(Array.isArray(systemRes.data) ? systemRes.data : []);
    } catch (error) {
      console.error('Load error:', error);
      toast.error('Failed to load notification data');
    } finally {
      setLoading(false);
    }
  };

  const loadRecallWindow = async () => {
    try {
      const { data } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'notification_recall_window_minutes')
        .maybeSingle();
      
      const setting = data as any;
      if (setting?.setting_value) {
        setRecallWindowMinutes(parseInt(setting.setting_value));
      }
    } catch (error) {
      console.error('Failed to load recall window:', error);
    }
  };

  const handleSendNotification = async () => {
    if (!notification.title || !notification.body) {
      toast.error('Title and body are required');
      return;
    }

    if (!confirm(`Send notification to ${notification.target_type === 'all' ? 'all subscribed users' : 'specific user'}?\n\nRecall window: ${recallWindowMinutes} minutes`)) {
      return;
    }

    setSending(true);
    try {
      const { data, error } = await invokeEdgeFunction('send-push-notification', {
        body: {
          ...notification,
          created_by: user?.id
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to send notification');

      toast.success(`Notification sent successfully to ${data.stats.delivered} users!`);
      setNotification({
        title: '',
        body: '',
        target_type: 'all',
        target_id: '',
        action_url: '',
        icon_url: '',
        category_id: ''
      });
      loadData();
    } catch (error: unknown) {
      console.error('Send error:', error);
      toast.error((error as any).message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const handleRecallNotification = async (notificationId: string) => {
    if (!confirm('Are you sure you want to recall this notification?\n\nThis will cancel the notification for all users who have not yet clicked it.')) {
      return;
    }

    try {
      const { error } = await (supabase
        .from('notification_history') as any)
        .update({ recalled_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      toast.success('Notification recalled successfully');
      loadData();
    } catch (error: unknown) {
      console.error('Recall error:', error);
      toast.error('Failed to recall notification');
    }
  };

  const canRecall = (notification: NotificationHistory): boolean => {
    if (notification.recalled_at) return false;
    if (notification.target_type !== 'all') return false;
    
    try {
      const sentDate = new Date(notification.sent_at);
      if (isNaN(sentDate.getTime())) return false;
      const minutesSinceSent = differenceInMinutes(new Date(), sentDate);
      return minutesSinceSent < recallWindowMinutes;
    } catch (e) {
      return false;
    }
  };

  const formatSafeDate = (dateStr: string | null | undefined, formatStr: string = 'MMM dd, HH:mm') => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return format(date, formatStr);
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const getRecallStatus = (notification: NotificationHistory): string => {
    if (notification.recalled_at) return 'Recalled';
    if (canRecall(notification)) return 'Recallable';
    return 'Recall Expired';
  };

  const handleApplyTemplate = (template: any) => {
    setNotification({
      ...notification,
      title: template.title,
      body: template.body,
      category_id: template.category_id || ''
    });
    setActiveTab('compose');
    toast.success('Template applied');
  };

  const handleSaveAsTemplate = () => {
    if (!notification.title || !notification.body) {
      toast.error('Title and body are required to create a template');
      return;
    }
    const cat = categories.find(c => c.id === notification.category_id);
    setNewTemplate({
      ...newTemplate,
      title: notification.title,
      body: notification.body,
      category_id: notification.category_id,
      category: cat ? cat.name : 'Announcement'
    });
    setIsDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!newTemplate.name || !newTemplate.title || !newTemplate.body) {
      toast.error('Name, title and body are required');
      return;
    }

    setCreatingTemplate(true);
    try {
      // Clean up data
      const templateToSave = {
        name: newTemplate.name,
        title: newTemplate.title,
        body: newTemplate.body,
        category: newTemplate.category,
        category_id: newTemplate.category_id || null
      };

      const { data, error } = await (supabase
        .from('notification_templates') as any)
        .insert([templateToSave])
        .select();

      if (error) throw error;

      if (data?.[0]) {
        setTemplates([data[0], ...templates]);
        toast.success('Template created successfully');
        setNewTemplate({
          name: '',
          title: '',
          body: '',
          category: 'announcement',
          category_id: ''
        });
        setIsDialogOpen(false);
      }
    } catch (error: unknown) {
      console.error('Create template error:', error);
      toast.error((error as any).message || 'Failed to create template');
    } finally {
      setCreatingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('notification_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTemplates(templates.filter(t => t.id !== id));
      toast.success('Template deleted');
    } catch (error: unknown) {
      toast.error('Failed to delete template');
    }
  };

  const handleDeleteHistory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this history record?')) return;

    try {
      const { error } = await supabase
        .from('notification_history')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setHistory(history.filter(h => h.id !== id));
      toast.success('Record deleted');
    } catch (error: unknown) {
      toast.error('Failed to delete record');
    }
  };

  const handleDeleteSystemLog = async (id: string) => {
    if (!confirm('Are you sure you want to delete this system log?')) return;

    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
      setSystemNotifications(systemNotifications.filter(n => n.id !== id));
      toast.success('Log deleted');
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name) {
      toast.error('Category name is required');
      return;
    }

    setCreatingCategory(true);
    try {
      const { data, error } = await (supabase
        .from('notification_categories') as any)
        .insert([{
          name: newCategory.name,
          description: newCategory.description,
          color: newCategory.color,
          is_system: false
        }])
        .select();

      if (error) throw error;

      if (data?.[0]) {
        toast.success('Category created successfully');
        setCategories([...categories, data[0]]);
        setNewCategory({ name: '', description: '', color: '#BF953F' });
        setIsCategoryDialogOpen(false);
      }
    } catch (error: unknown) {
      console.error('Create category error:', error);
      toast.error((error as any).message || 'Failed to create category');
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;

    try {
      const { error } = await (supabase
        .from('notification_categories') as any)
        .update({
          name: editingCategory.name,
          description: editingCategory.description,
          color: editingCategory.color
        })
        .eq('id', editingCategory.id);

      if (error) throw error;

      toast.success('Category updated successfully');
      setCategories(categories.map(c => c.id === editingCategory.id ? editingCategory : c));
      setEditingCategory(null);
    } catch (error: unknown) {
      console.error('Update category error:', error);
      toast.error('Failed to update category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const category = categories.find(c => c.id === id);
    if (category?.is_system) {
      toast.error('System categories cannot be deleted');
      return;
    }

    // Check if category is in use
    const inUse = history.some(h => h.category_id === id);
    if (inUse) {
      toast.error('Cannot delete category that is being used by notifications');
      return;
    }

    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const { error } = await supabase
        .from('notification_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCategories(categories.filter(c => c.id !== id));
      toast.success('Category deleted');
    } catch (error: unknown) {
      toast.error('Failed to delete category');
    }
  };
  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const val = row[header];
          const cell = val === null || val === undefined ? '' : String(val).replace(/"/g, '""');
          return `"${cell}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExportHistory = () => {
    const exportData = history.map(h => ({
      id: h.id,
      title: h.title,
      body: h.body,
      target_type: h.target_type,
      category: h.notification_categories?.name || 'Uncategorized',
      sent_at: h.sent_at,
      recalled_at: h.recalled_at || 'N/A',
      stats_delivered: h.stats?.delivered || 0,
      stats_clicked: h.stats?.clicked || 0,
      created_by: h.created_by || 'System'
    }));
    downloadCSV(exportData, `notification_history_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
    toast.success('Notification history exported');
  };

  const handleExportSystemLogs = () => {
    const exportData = systemNotifications.map(n => ({
      id: n.id,
      user: n.profiles?.email || 'System',
      title: n.title,
      message: n.message,
      type: n.type,
      is_read: n.is_read,
      created_at: n.created_at
    }));
    downloadCSV(exportData, `system_logs_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
    toast.success('System logs exported');
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-xs font-bold uppercase tracking-widest opacity-50">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-8 max-w-7xl mx-auto">
      <SEOHead title="Notification Management" noindex={true} />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-4xl font-black v56-gradient-text tracking-tight leading-tight flex items-center gap-3">
            <Bell className="h-8 w-8 text-primary" />
            Notification <span className="text-foreground">Management</span>
          </h1>
          <p className="text-xs uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            Browser Push Notifications & User Broadcasts
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={loadData} 
          className="h-12 rounded-xl border-primary/20 hover:bg-primary/5"
        >
          <History className="mr-2 h-4 w-4" />
          Refresh Data
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="v56-glass premium-border p-1 h-14 rounded-2xl gap-2 bg-white/5">
          <TabsTrigger value="compose" className="rounded-xl font-bold uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-full">
            <Plus className="mr-2 h-4 w-4" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="categories" className="rounded-xl font-bold uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-full">
            <Tag className="mr-2 h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="templates" className="rounded-xl font-bold uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-full">
            <Layout className="mr-2 h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl font-bold uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-full">
            <History className="mr-2 h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="system_logs" className="rounded-xl font-bold uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-full">
            <Bell className="mr-2 h-4 w-4" />
            System Logs
          </TabsTrigger>
          <TabsTrigger value="recall" className="rounded-xl font-bold uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-full">
            <Undo2 className="mr-2 h-4 w-4" />
            Recall
          </TabsTrigger>
          <TabsTrigger value="categories" className="rounded-xl font-bold uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-full">
            <Tag className="mr-2 h-4 w-4" />
            Categories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="v56-glass premium-border overflow-hidden">
              <CardHeader className="bg-primary/5 border-b border-white/5">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Send className="h-5 w-5 text-primary" />
                  Broadcast Notification
                </CardTitle>
                <CardDescription>Compose a message to send to your users.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest">Target Audience</Label>
                    <Select 
                      value={notification.target_type} 
                      onValueChange={(val) => setNotification({...notification, target_type: val})}
                    >
                      <SelectTrigger className="rounded-xl h-12 border-white/10 bg-white/5">
                        <SelectValue placeholder="Select target audience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subscribed Users</SelectItem>
                        <SelectItem value="individual">Specific User</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {notification.target_type === 'individual' && (
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest">User ID</Label>
                      <Input 
                        placeholder="Enter Supabase User ID" 
                        value={notification.target_id}
                        onChange={(e) => setNotification({...notification, target_id: e.target.value})}
                        className="rounded-xl h-12 border-white/10 bg-white/5"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest">Category</Label>
                    <Select 
                      value={notification.category_id} 
                      onValueChange={(val) => setNotification({...notification, category_id: val})}
                    >
                      <SelectTrigger className="rounded-xl h-12 border-white/10 bg-white/5">
                        <SelectValue placeholder="Select category (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories && categories.length > 0 ? categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                              {cat.name}
                            </div>
                          </SelectItem>
                        )) : (
                          <SelectItem value="none" disabled>No categories available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest">Title (Max 50 characters)</Label>
                    <Input 
                      placeholder="e.g. New Investment Opportunity" 
                      maxLength={50}
                      value={notification.title}
                      onChange={(e) => setNotification({...notification, title: e.target.value})}
                      className="rounded-xl h-12 border-white/10 bg-white/5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest">Message Body (Max 200 characters)</Label>
                    <Textarea 
                      placeholder="Describe your notification..." 
                      maxLength={200}
                      value={notification.body}
                      onChange={(e) => setNotification({...notification, body: e.target.value})}
                      className="rounded-xl min-h-[120px] border-white/10 bg-white/5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest">Action URL (Optional)</Label>
                    <Input 
                      placeholder="e.g. https://goldxusdt.com/blog/new-post" 
                      value={notification.action_url}
                      onChange={(e) => setNotification({...notification, action_url: e.target.value})}
                      className="rounded-xl h-12 border-white/10 bg-white/5"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    onClick={handleSaveAsTemplate} 
                    variant="outline"
                    className="flex-1 h-14 rounded-xl font-bold uppercase tracking-widest border-primary/20 hover:bg-primary/5"
                    disabled={sending}
                  >
                    <Save className="mr-2 h-4 w-4 text-primary" />
                    Save as Template
                  </Button>
                  <Button 
                    onClick={handleSendNotification} 
                    className="flex-[2] h-14 rounded-xl font-bold uppercase tracking-widest premium-gradient"
                    disabled={sending}
                  >
                    {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Send Push Notification
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-8">
              <Card className="v56-glass premium-border overflow-hidden">
                <CardHeader className="bg-white/5 border-b border-white/5">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg font-black flex items-center gap-2">
                        <Monitor className="h-5 w-5 text-blue-500" />
                        Real-Time Preview
                      </CardTitle>
                      <CardDescription>How users will see your notification.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={previewType === 'mobile' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPreviewType('mobile')}
                        className="h-8 rounded-lg"
                      >
                        <Smartphone className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={previewType === 'desktop' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPreviewType('desktop')}
                        className="h-8 rounded-lg"
                      >
                        <Monitor className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 flex justify-center bg-black/20 min-h-[400px] items-center">
                  <NotificationPreview
                    title={notification.title}
                    body={notification.body}
                    iconUrl={notification.icon_url}
                    type={previewType}
                  />
                </CardContent>
              </Card>

              <Card className="v56-glass premium-border overflow-hidden">
                <CardHeader className="bg-white/5 border-b border-white/5">
                  <CardTitle className="text-lg font-black flex items-center gap-2">
                    <Settings className="h-5 w-5 text-amber-500" />
                    Sending Policy
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4 text-xs text-muted-foreground">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-amber-500/80">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>Global notifications can be recalled within {recallWindowMinutes} minutes after sending.</p>
                  </div>
                  <ul className="space-y-2 list-disc pl-4">
                    <li>Rate limiting: Maximum 10 notifications per user per day.</li>
                    <li>Browser support: Chrome, Firefox, Safari, Edge (Desktop & Mobile).</li>
                    <li>Privacy: User consent is required for all broadcast communications.</li>
                    <li>Persistence: Notifications expire and are cleared after 7 days if unclicked.</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-8">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Manage notification categories for better organization and filtering.</p>
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button className="premium-gradient rounded-xl font-bold uppercase tracking-widest">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent className="v56-glass premium-border text-foreground">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black">Create Custom Category</DialogTitle>
                  <DialogDescription>
                    Define a new notification category for organization.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest">Category Name</Label>
                    <Input 
                      placeholder="e.g. Marketing Campaign" 
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                      className="rounded-xl h-12 border-white/10 bg-white/5"
                      maxLength={50}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest">Description (Optional)</Label>
                    <Textarea 
                      placeholder="Brief description of this category..." 
                      value={newCategory.description}
                      onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                      className="rounded-xl min-h-[80px] border-white/10 bg-white/5"
                      maxLength={200}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest">Color</Label>
                    <div className="flex gap-3">
                      <Input 
                        type="color"
                        value={newCategory.color}
                        onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
                        className="h-12 w-20 rounded-xl border-white/10 bg-white/5 cursor-pointer"
                      />
                      <Input 
                        value={newCategory.color}
                        onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
                        className="rounded-xl h-12 border-white/10 bg-white/5 flex-1"
                        placeholder="#BF953F"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)} className="rounded-xl" disabled={creatingCategory}>Cancel</Button>
                  <Button 
                    onClick={handleCreateCategory} 
                    className="premium-gradient rounded-xl font-bold uppercase tracking-widest px-8"
                    disabled={creatingCategory}
                  >
                    {creatingCategory ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Category'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories && categories.length > 0 ? categories.map((category) => (
              <Card key={category.id} className="v56-glass premium-border overflow-hidden hover:scale-[1.02] transition-transform relative group">
                {!category.is_system && (
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setEditingCategory(category)}
                      className="h-8 w-8 text-blue-500 hover:bg-blue-500/10 rounded-lg"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteCategory(category.id)}
                      className="h-8 w-8 text-red-500 hover:bg-red-500/10 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <CardHeader className="bg-white/5 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${category.color}20`, border: `2px solid ${category.color}40` }}>
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-black truncate">{category.name}</CardTitle>
                      {category.is_system && (
                        <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest mt-1">System</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {category.description || 'No description provided'}
                  </p>
                </CardContent>
              </Card>
            )) : (
              <div className="col-span-full text-center py-20 text-muted-foreground italic">
                No categories found.
              </div>
            )}
          </div>

          {editingCategory && (
            <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
              <DialogContent className="v56-glass premium-border text-foreground duration-0 animate-none fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black">Edit Category</DialogTitle>
                  <DialogDescription>
                    Update category details.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest">Category Name</Label>
                    <Input 
                      value={editingCategory.name}
                      onChange={(e) => setEditingCategory({...editingCategory, name: e.target.value})}
                      className="rounded-xl h-12 border-white/10 bg-white/5"
                      maxLength={50}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest">Description</Label>
                    <Textarea 
                      value={editingCategory.description || ''}
                      onChange={(e) => setEditingCategory({...editingCategory, description: e.target.value})}
                      className="rounded-xl min-h-[80px] border-white/10 bg-white/5"
                      maxLength={200}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest">Color</Label>
                    <div className="flex gap-3">
                      <Input 
                        type="color"
                        value={editingCategory.color}
                        onChange={(e) => setEditingCategory({...editingCategory, color: e.target.value})}
                        className="h-12 w-20 rounded-xl border-white/10 bg-white/5 cursor-pointer"
                      />
                      <Input 
                        value={editingCategory.color}
                        onChange={(e) => setEditingCategory({...editingCategory, color: e.target.value})}
                        className="rounded-xl h-12 border-white/10 bg-white/5 flex-1"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingCategory(null)} className="rounded-xl">Cancel</Button>
                  <Button 
                    onClick={handleUpdateCategory} 
                    className="premium-gradient rounded-xl font-bold uppercase tracking-widest px-8"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-8">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Manage reusable notification templates for quick broadcasting.</p>
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="premium-gradient rounded-xl font-bold uppercase tracking-widest"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Card className="v56-glass premium-border border-dashed border-white/20 hover:border-primary/50 transition-all cursor-pointer group flex flex-col items-center justify-center p-8 h-[240px]">
                  <Plus className="h-10 w-10 text-muted-foreground group-hover:text-primary mb-4 transition-colors" />
                  <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">New Template</p>
                </Card>
              </DialogTrigger>
              <DialogContent className="v56-glass premium-border text-foreground">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black">Create New Template</DialogTitle>
                  <DialogDescription>
                    Define a reusable notification template.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest">Internal Name</Label>
                    <Input 
                      placeholder="e.g. Welcome Message" 
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                      className="rounded-xl h-12 border-white/10 bg-white/5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest">Category</Label>
                    <Select 
                      value={newTemplate.category_id}
                      onValueChange={(val) => {
                        const cat = categories.find(c => c.id === val);
                        setNewTemplate({
                          ...newTemplate, 
                          category_id: val,
                          category: cat ? cat.name : 'Announcement'
                        });
                      }}
                    >
                      <SelectTrigger className="rounded-xl h-12 border-white/10 bg-white/5">
                        <SelectValue placeholder="Select category (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories && categories.length > 0 ? categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                              {cat.name}
                            </div>
                          </SelectItem>
                        )) : (
                          <SelectItem value="none" disabled>No categories available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest">Notification Title</Label>
                    <Input 
                      placeholder="e.g. Welcome to Gold X Usdt" 
                      value={newTemplate.title}
                      onChange={(e) => setNewTemplate({...newTemplate, title: e.target.value})}
                      className="rounded-xl h-12 border-white/10 bg-white/5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest">Notification Body</Label>
                    <Textarea 
                      placeholder="Template content..." 
                      value={newTemplate.body}
                      onChange={(e) => setNewTemplate({...newTemplate, body: e.target.value})}
                      className="rounded-xl min-h-[100px] border-white/10 bg-white/5"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">Cancel</Button>
                  <Button 
                    onClick={handleSaveTemplate} 
                    disabled={creatingTemplate}
                    className="premium-gradient rounded-xl font-bold uppercase tracking-widest px-8"
                  >
                    {creatingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Template'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {templates.map((template) => (
              <Card key={template.id} className="v56-glass premium-border overflow-hidden hover:scale-[1.02] transition-transform relative group">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="absolute top-2 right-2 h-8 w-8 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 rounded-lg"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <CardHeader className="bg-white/5 border-b border-white/5">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary border-primary/20">
                      {template.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-black mt-3">{template.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  <p className="text-xs font-bold line-clamp-1">{template.title}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-3 leading-relaxed">{template.body}</p>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-[10px] font-black uppercase tracking-widest h-10 rounded-xl"
                    onClick={() => handleApplyTemplate(template)}
                  >
                    Apply Template
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-8">
          <Card className="v56-glass premium-border overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/5">
                    <TableHead className="py-6 pl-8 font-black uppercase tracking-widest text-[10px]">Notification</TableHead>
                    <TableHead className="py-6 font-black uppercase tracking-widest text-[10px]">Category</TableHead>
                    <TableHead className="py-6 font-black uppercase tracking-widest text-[10px]">Audience</TableHead>
                    <TableHead className="py-6 font-black uppercase tracking-widest text-[10px]">Delivered</TableHead>
                    <TableHead className="py-6 font-black uppercase tracking-widest text-[10px]">Status</TableHead>
                    <TableHead className="py-6 pr-8 text-right font-black uppercase tracking-widest text-[10px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableCell colSpan={6} className="p-0">
                      <div className="flex justify-end p-4 bg-primary/5 border-b border-white/5">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleExportHistory}
                          className="h-10 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                        >
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          Export History CSV
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {history.map((log) => (
                    <TableRow key={log.id} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell className="py-6 pl-8">
                        <div className="space-y-1">
                          <p className="text-sm font-bold">{log.title}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{log.body}</p>
                          <p className="text-[9px] text-muted-foreground/60">{formatSafeDate(log.sent_at, 'MMM dd, yyyy HH:mm')}</p>
                        </div>
                      </TableCell>
                      <TableCell className="py-6">
                        {log.notification_categories && (
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: log.notification_categories.color }} />
                            <span className="text-xs font-bold">{log.notification_categories.name}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-6">
                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest">
                          {log.target_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-6">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-black">{log.stats?.delivered || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-6">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[9px] font-black uppercase tracking-widest",
                            log.recalled_at ? "bg-red-500/10 text-red-500 border-red-500/20" :
                            canRecall(log) ? "bg-green-500/10 text-green-500 border-green-500/20" :
                            "bg-gray-500/10 text-gray-500 border-gray-500/20"
                          )}
                        >
                          {getRecallStatus(log)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-6 pr-8 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteHistory(log.id)}
                          className="text-red-500 hover:text-red-400 hover:bg-red-500/10 h-10 w-10 rounded-xl"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {history.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-20 text-center text-muted-foreground italic text-sm">
                        No broadcast history found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system_logs" className="space-y-8">
          <Card className="v56-glass premium-border overflow-hidden">
            <CardHeader className="bg-white/5 border-b border-white/5">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Individual System Notifications
              </CardTitle>
              <CardDescription>Direct alerts sent to specific users (deposits, withdrawals, etc.)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/5">
                    <TableHead className="py-6 pl-8 font-black uppercase tracking-widest text-[10px]">User</TableHead>
                    <TableHead className="py-6 font-black uppercase tracking-widest text-[10px]">Title</TableHead>
                    <TableHead className="py-6 font-black uppercase tracking-widest text-[10px]">Type</TableHead>
                    <TableHead className="py-6 font-black uppercase tracking-widest text-[10px]">Sent At</TableHead>
                    <TableHead className="py-6 pr-8 text-right font-black uppercase tracking-widest text-[10px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableCell colSpan={5} className="p-0">
                      <div className="flex justify-end p-4 bg-primary/5 border-b border-white/5">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleExportSystemLogs}
                          className="h-10 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                        >
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          Export Logs CSV
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {systemNotifications.map((n) => (
                    <TableRow key={n.id} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell className="py-6 pl-8">
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold truncate max-w-[200px]">{n.profiles?.email}</p>
                          <p className="text-[10px] text-muted-foreground italic truncate max-w-[200px]">{n.profiles?.full_name || 'No Name'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="py-6">
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold">{n.title}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{n.message}</p>
                        </div>
                      </TableCell>
                      <TableCell className="py-6">
                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest">
                          {n.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-6 text-xs text-muted-foreground">
                        {formatSafeDate(n.created_at)}
                      </TableCell>
                      <TableCell className="py-6 pr-8 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteSystemLog(n.id)}
                          className="text-red-500 hover:text-red-400 hover:bg-red-500/10 h-10 w-10 rounded-xl"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {systemNotifications.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-20 text-center text-muted-foreground italic text-sm">
                        No system notifications found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recall" className="space-y-8">
          <Card className="v56-glass premium-border overflow-hidden">
            <CardHeader className="bg-amber-500/5 border-b border-white/5">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Undo2 className="h-5 w-5 text-amber-500" />
                Recallable Notifications
              </CardTitle>
              <CardDescription>
                Cancel global notifications within {recallWindowMinutes} minutes of sending. Individual notifications cannot be recalled.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              {history.filter(canRecall).length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                    <Undo2 className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No recallable notifications at this time.</p>
                </div>
              ) : (
                history.filter(canRecall).map((notification) => {
                  const minutesRemaining = recallWindowMinutes - differenceInMinutes(new Date(), new Date(notification.sent_at));
                  return (
                    <Card key={notification.id} className="v56-glass border-amber-500/20 overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row justify-between gap-6">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm font-black">{notification.title}</p>
                                <p className="text-xs text-muted-foreground mt-1">{notification.body}</p>
                              </div>
                              {notification.notification_categories && (
                                <div className="flex items-center gap-2 ml-4">
                                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: notification.notification_categories.color }} />
                                  <span className="text-[10px] font-bold">{notification.notification_categories.name}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-4 text-[10px] text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Send className="h-3 w-3" />
                                <span>Sent: {formatSafeDate(notification.sent_at)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                <span>{notification.stats?.delivered || 0} delivered</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-3 w-3 text-amber-500" />
                                <span className="font-bold text-amber-500">{minutesRemaining} min remaining</span>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => handleRecallNotification(notification.id)}
                            className="h-12 rounded-xl border-red-500/20 text-red-500 hover:bg-red-500/10 font-bold uppercase tracking-widest"
                          >
                            <Undo2 className="mr-2 h-4 w-4" />
                            Recall Now
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
