import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/services/supabase';
import { SEOHead } from '@/utils/seo';

export default function KYCPolicyPage() {
  const [content, setContent] = useState('');

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const { data, error } = await supabase
        .from('content_pages')
        .select('content')
        .eq('slug', 'kyc-policy')
        .single();

      if (error) throw error;
      setContent((data as any)?.content || 'KYC Policy content will be available soon.');
    } catch (error) {
      setContent('KYC Policy content will be available soon.');
    }
  };

  return (
    <>
      <SEOHead 
        title="KYC Policy" 
        description="Read our Identity Verification (KYC) policy to understand how we secure your account and comply with global regulations."
      />
      <div className="min-h-screen p-6">
        <div className="container max-w-4xl mx-auto">
          <Card className="border-primary/20 card-glow overflow-hidden bg-card/50 backdrop-blur-xl rounded-3xl">
            <CardHeader className="p-8 border-b border-white/5">
              <CardTitle className="text-4xl font-black v56-gradient-text">KYC Policy</CardTitle>
            </CardHeader>
            <CardContent className="p-8 prose prose-invert max-w-none">
              <div 
                className="whitespace-pre-wrap text-muted-foreground leading-relaxed"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
