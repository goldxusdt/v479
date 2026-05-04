import { Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/services/supabase';

export default function AdminContentPage() {
  const [loading, setLoading] = useState(false);
  const [terms, setTerms] = useState('');
  const [privacy, setPrivacy] = useState('');
  const [kyc, setKyc] = useState('');
  const [refund, setRefund] = useState('');

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const { data, error } = await supabase
        .from('content_pages')
        .select('*')
        .in('slug', ['terms-and-conditions', 'privacy-policy', 'kyc-policy', 'refund-policy']);

      if (error) throw error;

      (data as any)?.forEach((page: any) => {
        if (page.slug === 'terms-and-conditions') setTerms(page.content);
        if (page.slug === 'privacy-policy') setPrivacy(page.content);
        if (page.slug === 'kyc-policy') setKyc(page.content);
        if (page.slug === 'refund-policy') setRefund(page.content);
      });
    } catch (error) {
      console.error('Failed to load content:', error);
    }
  };

  const handleSave = async (slug: string, content: string, title: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('content_pages')
        .upsert({
          slug,
          content,
          title
        } as any, {
          onConflict: 'slug'
        });

      if (error) throw error;
      toast.success(`${title} saved successfully`);
    } catch (error) {
      console.error('Failed to save content:', error);
      toast.error('Failed to save content');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold v56-gradient-text">Content Management</h1>
        <p className="text-muted-foreground">Edit Terms & Conditions and Privacy Policy</p>
      </div>

      <Card className="v56-glass premium-border">
        <CardHeader>
          <CardTitle>Terms & Conditions</CardTitle>
          <CardDescription>Edit the terms and conditions page (supports HTML)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            rows={10}
            placeholder="Enter terms and conditions..."
          />
          <Button onClick={() => handleSave('terms-and-conditions', terms, 'Terms & Conditions')} disabled={loading} className="">
            <Save className="h-4 w-4 mr-2" />
            Save Terms & Conditions
          </Button>
        </CardContent>
      </Card>

      <Card className="v56-glass premium-border">
        <CardHeader>
          <CardTitle>Privacy Policy</CardTitle>
          <CardDescription>Edit the privacy policy page (supports HTML)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value)}
            rows={10}
            placeholder="Enter privacy policy..."
          />
          <Button onClick={() => handleSave('privacy-policy', privacy, 'Privacy Policy')} disabled={loading} className="">
            <Save className="h-4 w-4 mr-2" />
            Save Privacy Policy
          </Button>
        </CardContent>
      </Card>

      <Card className="v56-glass premium-border">
        <CardHeader>
          <CardTitle>KYC Policy</CardTitle>
          <CardDescription>Edit the identity verification policy (supports HTML)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={kyc}
            onChange={(e) => setKyc(e.target.value)}
            rows={10}
            placeholder="Enter KYC policy content..."
          />
          <Button onClick={() => handleSave('kyc-policy', kyc, 'KYC Policy')} disabled={loading} className="">
            <Save className="h-4 w-4 mr-2" />
            Save KYC Policy
          </Button>
        </CardContent>
      </Card>

      <Card className="v56-glass premium-border">
        <CardHeader>
          <CardTitle>Refund Policy</CardTitle>
          <CardDescription>Edit the refund and cancellation policy (supports HTML)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={refund}
            onChange={(e) => setRefund(e.target.value)}
            rows={10}
            placeholder="Enter refund policy content..."
          />
          <Button onClick={() => handleSave('refund-policy', refund, 'Refund Policy')} disabled={loading} className="">
            <Save className="h-4 w-4 mr-2" />
            Save Refund Policy
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
