import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getLandingPageSettings, updateLandingPageSection } from '@/services/api';
import { Separator } from '@/components/ui/separator';

export default function AdminLandingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('hero');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const data = await getLandingPageSettings();
    setSettings(data);
    setLoading(false);
  };

  const getSectionContent = (name: string) => {
    return settings.find(s => s.section_name === name)?.content || {};
  };

  const handleUpdateSection = async (sectionName: string, content: any) => {
    setSaving(true);
    const { error } = await updateLandingPageSection(sectionName, content);
    if (error) {
      toast.error(`Failed to update ${sectionName} section`);
    } else {
      toast.success(`${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)} section updated`);
      fetchSettings();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Landing Page Management</h2>
          <p className="text-muted-foreground text-sm">Customize your landing page content and SEO settings</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-background/50 border border-border p-1 h-auto flex flex-wrap gap-2">
          <TabsTrigger value="hero" className="px-4 py-2">Hero Section</TabsTrigger>
          <TabsTrigger value="slider" className="px-4 py-2">Slider</TabsTrigger>
          <TabsTrigger value="about" className="px-4 py-2">About Section</TabsTrigger>
          <TabsTrigger value="stats" className="px-4 py-2">Stats</TabsTrigger>
          <TabsTrigger value="features" className="px-4 py-2">Features</TabsTrigger>
          <TabsTrigger value="investment" className="px-4 py-2">Investment Plan</TabsTrigger>
          <TabsTrigger value="cta" className="px-4 py-2">CTA Section</TabsTrigger>
          <TabsTrigger value="referral" className="px-4 py-2">Referral Section</TabsTrigger>
          <TabsTrigger value="security" className="px-4 py-2">Security Section</TabsTrigger>
          <TabsTrigger value="testimonials" className="px-4 py-2">Testimonials</TabsTrigger>
          <TabsTrigger value="seo" className="px-4 py-2">SEO Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="hero">
          <HeroEditor 
            content={getSectionContent('hero')} 
            onSave={(content: any) => handleUpdateSection('hero', content)}
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="slider">
          <SliderEditor 
            content={getSectionContent('slider')} 
            onSave={(content: any) => handleUpdateSection('slider', content)}
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="about">
          <AboutEditor 
            content={getSectionContent('about')} 
            onSave={(content: any) => handleUpdateSection('about', content)}
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="stats">
          <StatsEditor 
            content={getSectionContent('stats')} 
            onSave={(content: any) => handleUpdateSection('stats', content)}
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="features">
          <FeaturesEditor 
            content={getSectionContent('features')} 
            onSave={(content: any) => handleUpdateSection('features', content)}
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="investment">
          <InvestmentEditor 
            content={getSectionContent('investment_plan')} 
            onSave={(content: any) => handleUpdateSection('investment_plan', content)}
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="cta">
          <CTAEditor 
            content={getSectionContent('cta')} 
            onSave={(content: any) => handleUpdateSection('cta', content)}
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="referral">
          <ReferralEditor 
            content={getSectionContent('referral')} 
            onSave={(content: any) => handleUpdateSection('referral', content)}
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="security">
          <SecurityEditor 
            content={getSectionContent('security')} 
            onSave={(content: any) => handleUpdateSection('security', content)}
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="testimonials">
          <TestimonialsEditor 
            content={getSectionContent('testimonials')} 
            onSave={(content: any) => handleUpdateSection('testimonials', content)}
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="seo">
          <SEOEditor 
            content={getSectionContent('seo')} 
            onSave={(content: any) => handleUpdateSection('seo', content)}
            saving={saving}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SliderEditor({ content, onSave, saving }: any) {
  const [data, setData] = useState(content || { slides: [] });

  useEffect(() => setData(content || { slides: [] }), [content]);

  const updateSlide = (index: number, field: string, value: string) => {
    const newSlides = [...(data.slides || [])];
    newSlides[index] = { ...newSlides[index], [field]: value };
    setData({ ...data, slides: newSlides });
  };

  const addSlide = () => {
    const currentSlides = Array.isArray(data.slides) ? data.slides : [];
    setData({
      ...data,
      slides: [...currentSlides, { image: '', title: '', subtitle: '' }]
    });
  };

  const removeSlide = (index: number) => {
    const newSlides = (data.slides || []).filter((_: any, i: number) => i !== index);
    setData({ ...data, slides: newSlides });
  };

  return (
    <Card className="border-border bg-background/50">
      <CardHeader>
        <CardTitle>Hero Slider Settings</CardTitle>
        <CardDescription>Manage images and text for the main home slider</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-between items-center">
          <h4 className="font-bold">Slides</h4>
          <Button variant="outline" size="sm" onClick={addSlide}>
            <Plus className="h-4 w-4 mr-2" /> Add Slide
          </Button>
        </div>
        
        <div className="space-y-4">
          {(data.slides || []).map((slide: any, idx: number) => (
            <div key={idx} className="p-4 border border-border rounded-lg bg-background/50 space-y-4 relative">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => removeSlide(idx)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Image URL</Label>
                  <Input 
                    value={slide.image || ''} 
                    onChange={(e) => updateSlide(idx, 'image', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input 
                    value={slide.title || ''} 
                    onChange={(e) => updateSlide(idx, 'title', e.target.value)}
                  />
                </div>
                <div className="col-span-full space-y-2">
                  <Label>Subtitle</Label>
                  <Input 
                    value={slide.subtitle || ''} 
                    onChange={(e) => updateSlide(idx, 'subtitle', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
          
          {(data.slides || []).length === 0 && (
            <div className="text-center py-8 text-muted-foreground italic">
              No slides added. Using default hero background.
            </div>
          )}
        </div>

        <Button onClick={() => onSave(data)} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Slider Settings
        </Button>
      </CardContent>
    </Card>
  );
}

function HeroEditor({ content, onSave, saving }: any) {
  const [data, setData] = useState(content);

  useEffect(() => setData(content), [content]);

  return (
    <Card className="border-border bg-background/50">
      <CardHeader>
        <CardTitle>Hero Section</CardTitle>
        <CardDescription>Main banner and introductory text</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Badge Text</Label>
          <Input 
            value={data.badge} 
            onChange={(e) => setData({ ...data, badge: e.target.value })}
            placeholder="e.status: Active"
          />
        </div>
        <div className="space-y-2">
          <Label>Main Title</Label>
          <Input 
            value={data.title} 
            onChange={(e) => setData({ ...data, title: e.target.value })}
            placeholder="The Gold Standard..."
          />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea 
            value={data.description} 
            onChange={(e) => setData({ ...data, description: e.target.value })}
            placeholder="Join the elite circle..."
            rows={4}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Primary Button Text</Label>
            <Input 
              value={data.primary_button} 
              onChange={(e) => setData({ ...data, primary_button: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Secondary Button Text</Label>
            <Input 
              value={data.secondary_button} 
              onChange={(e) => setData({ ...data, secondary_button: e.target.value })}
            />
          </div>
        </div>
        <Button onClick={() => onSave(data)} disabled={saving} className="">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Hero Section
        </Button>
      </CardContent>
    </Card>
  );
}

function StatsEditor({ content, onSave, saving }: any) {
  const [stats, setStats] = useState(Array.isArray(content) ? content : []);

  useEffect(() => setStats(Array.isArray(content) ? content : []), [content]);

  const updateStat = (index: number, field: string, value: string) => {
    const newStats = [...stats];
    newStats[index] = { ...newStats[index], [field]: value };
    setStats(newStats);
  };

  return (
    <Card className="border-border bg-background/50">
      <CardHeader>
        <CardTitle>Stats Section</CardTitle>
        <CardDescription>Key platform metrics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stats.map((stat: any, idx: number) => (
            <div key={idx} className="p-4 border border-border rounded-lg bg-background/50 space-y-4">
              <div className="flex justify-between items-center">
                <Label className="font-bold">Stat #{idx + 1}</Label>
              </div>
              <div className="space-y-2">
                <Label>Value</Label>
                <Input 
                  value={stat.value} 
                  onChange={(e) => updateStat(idx, 'value', e.target.value)}
                  placeholder="10K+"
                />
              </div>
              <div className="space-y-2">
                <Label>Label</Label>
                <Input 
                  value={stat.label} 
                  onChange={(e) => updateStat(idx, 'label', e.target.value)}
                  placeholder="Active Investors"
                />
              </div>
            </div>
          ))}
        </div>
        <Button onClick={() => onSave(stats)} disabled={saving} className="">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Stats
        </Button>
      </CardContent>
    </Card>
  );
}

function FeaturesEditor({ content, onSave, saving }: any) {
  const [data, setData] = useState(content || { items: [] });

  useEffect(() => setData(content || { items: [] }), [content]);

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...(data.items || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    setData({ ...data, items: newItems });
  };

  const addItem = () => {
    const currentItems = Array.isArray(data.items) ? data.items : [];
    setData({
      ...data,
      items: [...currentItems, { title: 'New Feature', desc: 'Feature description' }]
    });
  };

  const removeItem = (index: number) => {
    const newItems = (data.items || []).filter((_: any, i: number) => i !== index);
    setData({ ...data, items: newItems });
  };

  return (
    <Card className="border-border bg-background/50">
      <CardHeader>
        <CardTitle>Features Section</CardTitle>
        <CardDescription>Value propositions and platform features</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Section Title</Label>
            <Input 
              value={data.title} 
              onChange={(e) => setData({ ...data, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Subtitle</Label>
            <Input 
              value={data.subtitle} 
              onChange={(e) => setData({ ...data, subtitle: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea 
            value={data.description} 
            onChange={(e) => setData({ ...data, description: e.target.value })}
            rows={3}
          />
        </div>

        <Separator />
        
        <div className="flex justify-between items-center">
          <h4 className="font-bold">Feature Items</h4>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-2" /> Add Feature
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.items?.map((item: any, idx: number) => (
            <div key={idx} className="p-4 border border-border rounded-lg bg-background/50 space-y-4 relative">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => removeItem(idx)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input 
                  value={item.title} 
                  onChange={(e) => updateItem(idx, 'title', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  value={item.desc} 
                  onChange={(e) => updateItem(idx, 'desc', e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>

        <Button onClick={() => onSave(data)} disabled={saving} className="">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Features
        </Button>
      </CardContent>
    </Card>
  );
}

function SEOEditor({ content, onSave, saving }: any) {
  const [data, setData] = useState(content || { keywords: [] });

  useEffect(() => setData(content || { keywords: [] }), [content]);

  return (
    <Card className="border-border bg-background/50">
      <CardHeader>
        <CardTitle>SEO Settings</CardTitle>
        <CardDescription>Search engine optimization and meta tags</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Page Title</Label>
          <Input 
            value={data.title} 
            onChange={(e) => setData({ ...data, title: e.target.value })}
            placeholder="Gold X Usdt - Premium..."
          />
        </div>
        <div className="space-y-2">
          <Label>Meta Description</Label>
          <Textarea 
            value={data.description} 
            onChange={(e) => setData({ ...data, description: e.target.value })}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label>Keywords (comma separated)</Label>
          <Textarea 
            value={Array.isArray(data.keywords) ? data.keywords.join(', ') : ''} 
            onChange={(e) => setData({ ...data, keywords: e.target.value.split(',').map((k: string) => k.trim()).filter(Boolean) })}
            placeholder="crypto, gold, usdt..."
            rows={3}
          />
        </div>
        <Button onClick={() => onSave(data)} disabled={saving} className="">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save SEO Settings
        </Button>
      </CardContent>
    </Card>
  );
}

function InvestmentEditor({ content, onSave, saving }: any) {
  const [data, setData] = useState(content || { features: [] });

  useEffect(() => setData(content || { features: [] }), [content]);

  const updateFeature = (index: number, value: string) => {
    const newFeatures = [...(data.features || [])];
    newFeatures[index] = value;
    setData({ ...data, features: newFeatures });
  };

  const addFeature = () => {
    const currentFeatures = Array.isArray(data.features) ? data.features : [];
    setData({ ...data, features: [...currentFeatures, 'New Feature'] });
  };

  const removeFeature = (index: number) => {
    const newFeatures = (data.features || []).filter((_: any, i: number) => i !== index);
    setData({ ...data, features: newFeatures });
  };

  return (
    <Card className="border-border bg-background/50">
      <CardHeader>
        <CardTitle>Investment Plan Section</CardTitle>
        <CardDescription>Main investment plan details and features</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Section Title</Label>
            <Input 
              value={data.title} 
              onChange={(e) => setData({ ...data, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>ROI Percentage</Label>
            <Input 
              value={data.roi} 
              onChange={(e) => setData({ ...data, roi: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea 
            value={data.description} 
            onChange={(e) => setData({ ...data, description: e.target.value })}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Plan Title</Label>
            <Input 
              value={data.plan_title} 
              onChange={(e) => setData({ ...data, plan_title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Plan Subtitle</Label>
            <Input 
              value={data.plan_subtitle} 
              onChange={(e) => setData({ ...data, plan_subtitle: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Min Deposit</Label>
            <Input 
              value={data.min_deposit} 
              onChange={(e) => setData({ ...data, min_deposit: e.target.value })}
            />
          </div>
        </div>

        <Separator />
        
        <div className="flex justify-between items-center">
          <h4 className="font-bold">Plan Features</h4>
          <Button variant="outline" size="sm" onClick={addFeature}>
            <Plus className="h-4 w-4 mr-2" /> Add Feature
          </Button>
        </div>

        <div className="space-y-2">
          {data.features?.map((feat: string, idx: number) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input 
                value={feat} 
                onChange={(e) => updateFeature(idx, e.target.value)}
              />
              <Button variant="ghost" size="icon" onClick={() => removeFeature(idx)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <Button onClick={() => onSave(data)} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Investment Plan
        </Button>
      </CardContent>
    </Card>
  );
}

function CTAEditor({ content, onSave, saving }: any) {
  const [data, setData] = useState(content || {});

  useEffect(() => setData(content || {}), [content]);

  return (
    <Card className="border-border bg-background/50">
      <CardHeader>
        <CardTitle>CTA Section</CardTitle>
        <CardDescription>Final call to action at the bottom of the page</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input 
            value={data.title} 
            onChange={(e) => setData({ ...data, title: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea 
            value={data.description} 
            onChange={(e) => setData({ ...data, description: e.target.value })}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label>Button Text</Label>
          <Input 
            value={data.button_text} 
            onChange={(e) => setData({ ...data, button_text: e.target.value })}
          />
        </div>
        <Button onClick={() => onSave(data)} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save CTA Section
        </Button>
      </CardContent>
    </Card>
  );
}

function AboutEditor({ content, onSave, saving }: any) {
  const [data, setData] = useState(content || {});

  useEffect(() => setData(content || {}), [content]);

  return (
    <Card className="border-border bg-background/50">
      <CardHeader>
        <CardTitle>About Section</CardTitle>
        <CardDescription>Company description and mission</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input 
            value={data.title} 
            onChange={(e) => setData({ ...data, title: e.target.value })}
            placeholder="About Gold X Usdt"
          />
        </div>
        <div className="space-y-2">
          <Label>Content</Label>
          <Textarea 
            value={data.content} 
            onChange={(e) => setData({ ...data, content: e.target.value })}
            rows={6}
          />
        </div>
        <Button onClick={() => onSave(data)} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save About Section
        </Button>
      </CardContent>
    </Card>
  );
}





function ReferralEditor({ content, onSave, saving }: any) {
  const [data, setData] = useState(content || { levels: [] });

  useEffect(() => setData(content || { levels: [] }), [content]);

  return (
    <Card className="border-border bg-background/50">
      <CardHeader>
        <CardTitle>Referral Section</CardTitle>
        <CardDescription>Configure referral program details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input 
            value={data.title} 
            onChange={(e) => setData({ ...data, title: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea 
            value={data.description} 
            onChange={(e) => setData({ ...data, description: e.target.value })}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label>Commission Rates (e.g. 5%, 3%, 1%)</Label>
          <Input 
            value={data.rates} 
            onChange={(e) => setData({ ...data, rates: e.target.value })}
          />
        </div>
        <Button onClick={() => onSave(data)} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Referral Section
        </Button>
      </CardContent>
    </Card>
  );
}

function SecurityEditor({ content, onSave, saving }: any) {
  const [data, setData] = useState(content || {});

  useEffect(() => setData(content || {}), [content]);

  return (
    <Card className="border-border bg-background/50">
      <CardHeader>
        <CardTitle>Security Section</CardTitle>
        <CardDescription>Security features and trust badges</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input 
            value={data.title} 
            onChange={(e) => setData({ ...data, title: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Content</Label>
          <Textarea 
            value={data.content} 
            onChange={(e) => setData({ ...data, content: e.target.value })}
            rows={4}
          />
        </div>
        <Button onClick={() => onSave(data)} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Security Section
        </Button>
      </CardContent>
    </Card>
  );
}

function TestimonialsEditor({ content, onSave, saving }: any) {
  const [data, setData] = useState(content || { items: [] });

  useEffect(() => setData(content || { items: [] }), [content]);

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...(data.items || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    setData({ ...data, items: newItems });
  };

  const addItem = () => {
    setData({
      ...data,
      items: [...(data.items || []), { name: '', role: '', quote: '', avatar: '' }]
    });
  };

  const removeItem = (index: number) => {
    const newItems = (data.items || []).filter((_: any, i: number) => i !== index);
    setData({ ...data, items: newItems });
  };

  return (
    <Card className="border-border bg-background/50">
      <CardHeader>
        <CardTitle>Testimonials</CardTitle>
        <CardDescription>User reviews and success stories</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-between items-center">
          <h4 className="font-bold">Testimonials</h4>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-2" /> Add Testimonial
          </Button>
        </div>
        
        <div className="space-y-4">
          {(data.items || []).map((item: any, idx: number) => (
            <div key={idx} className="p-4 border border-border rounded-lg bg-background/50 space-y-4 relative">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => removeItem(idx)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input 
                    value={item.name} 
                    onChange={(e) => updateItem(idx, 'name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input 
                    value={item.role} 
                    onChange={(e) => updateItem(idx, 'role', e.target.value)}
                  />
                </div>
                <div className="col-span-full space-y-2">
                  <Label>Quote</Label>
                  <Textarea 
                    value={item.quote} 
                    onChange={(e) => updateItem(idx, 'quote', e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button onClick={() => onSave(data)} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Testimonials
        </Button>
      </CardContent>
    </Card>
  );
}
