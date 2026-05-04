import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/services/supabase';

export default function PrivacyPage() {
  const [content, setContent] = useState('');

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const { data, error } = await supabase
        .from('content_pages')
        .select('content')
        .eq('slug', 'privacy-policy')
        .single();

      if (error) throw error;
      setContent((data as any)?.content || 'Privacy Policy content will be available soon.');
    } catch (error) {
      setContent('Privacy Policy content will be available soon.');
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="container max-w-4xl mx-auto">
        <Card className="border-primary/20 card-glow">
          <CardHeader>
            <CardTitle className="text-3xl v56-gradient-text">Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none">
            <div className="whitespace-pre-wrap">{content}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
