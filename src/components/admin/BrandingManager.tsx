import { Image, Globe, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AssetUploader } from '@/components/admin/AssetUploader';

interface BrandingManagerProps {
  settings: any;
  updateSetting: (key: string, value: string) => void;
}

export function BrandingManager({ settings, updateSetting }: BrandingManagerProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card className="v56-glass premium-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle>Platform Identity</CardTitle>
            </div>
            <CardDescription>Basic platform naming and description</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Site Title</Label>
              <Input
                value={settings.site_title}
                onChange={(e) => updateSetting('site_title', e.target.value)}
                placeholder="Gold X Usdt"
                className="premium-border bg-white/5"
              />
            </div>
            <div className="space-y-2">
              <Label>Site Tagline</Label>
              <Input
                value={settings.site_tagline}
                onChange={(e) => updateSetting('site_tagline', e.target.value)}
                placeholder="The Gold Standard of Digital Wealth"
                className="premium-border bg-white/5"
              />
            </div>
            <div className="space-y-2">
              <Label>Primary Brand Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={settings.primary_color || '#D4AF37'}
                  onChange={(e) => updateSetting('primary_color', e.target.value)}
                  className="w-12 h-10 p-1 bg-white/5 premium-border cursor-pointer"
                />
                <Input
                  value={settings.primary_color}
                  onChange={(e) => updateSetting('primary_color', e.target.value)}
                  placeholder="#D4AF37"
                  className="flex-1 premium-border bg-white/5 font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Brand Assets */}
        <Card className="v56-glass premium-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Image className="h-5 w-5 text-primary" />
              <CardTitle>Brand Assets</CardTitle>
            </div>
            <CardDescription>Logos and visual identifiers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <AssetUploader 
                value={settings.logo_header_url} 
                onUpload={(url: string) => updateSetting('logo_header_url', url)}
                onRemove={() => updateSetting('logo_header_url', '')}
                bucket="assets"
                label="Header Logo"
              />
            </div>
            <div className="space-y-3">
              <AssetUploader 
                value={settings.favicon_url} 
                onUpload={(url: string) => updateSetting('favicon_url', url)}
                onRemove={() => updateSetting('favicon_url', '')}
                bucket="assets"
                label="Favicon"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SEO & Meta Section */}
      <Card className="v56-glass premium-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            <CardTitle>SEO & Search Engine Configuration</CardTitle>
          </div>
          <CardDescription>Optimize how your platform appears in search results</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Meta Description</Label>
              <Textarea
                value={settings.seo_description}
                onChange={(e) => updateSetting('seo_description', e.target.value)}
                placeholder="Describe your platform for search engines..."
                className="premium-border bg-white/5 min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label>SEO Keywords</Label>
              <Textarea
                value={settings.seo_keywords}
                onChange={(e) => updateSetting('seo_keywords', e.target.value)}
                placeholder="gold, usdt, investment, passive income..."
                className="premium-border bg-white/5 min-h-[100px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
