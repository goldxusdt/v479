import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SEOHead } from '@/utils/seo';
import { HelpCircle, Shield, Users, Zap, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getGlobalFAQs } from '@/services/api';

const categoryIcons: Record<string, any> = {
  "General": HelpCircle,
  "Security": Shield,
  "Investment": Zap,
  "Withdrawal": Zap,
  "Network": Users,
  "Other": FileText
};

export default function FAQPage() {
  const [faqs, setFaqs] = useState<any[]>([]);

  useEffect(() => {
    fetchFAQs();
  }, []);

  const fetchFAQs = async () => {
    try {
      const data = await getGlobalFAQs(true);
      setFaqs(data || []);
    } catch (error) {
      console.error('Failed to fetch FAQs:', error);
    }
  };

  const groupedFaqs = faqs.reduce((acc: any, faq: any) => {
    const category = faq.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(faq);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background p-6 lg:p-20">
      <SEOHead 
        title="Frequently Asked Questions (FAQ)"
        description="Find answers to common questions about Gold X Usdt platform, security, investments, and referral program."
      />
      
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl lg:text-6xl font-black v56-gradient-text tracking-tighter">
            Frequently Asked <span className="text-foreground">Questions</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about the Gold X Usdt platform. Can't find the answer you're looking for? Contact our support team.
          </p>
        </div>

        <div className="grid gap-8">
          {Object.entries(groupedFaqs).map(([category, items]: [string, any], idx) => {
            const Icon = categoryIcons[category] || HelpCircle;
            return (
              <Card key={idx} className="v56-glass premium-border overflow-hidden">
                <CardHeader className="bg-primary/5 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-xl font-bold">{category}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Accordion type="single" collapsible className="w-full">
                    {items.map((item: any) => (
                      <AccordionItem key={item.id} value={item.id} className="border-b border-white/5 px-6">
                        <AccordionTrigger className="text-left font-bold py-4 hover:no-underline hover:text-primary transition-colors">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground pb-4 leading-relaxed whitespace-pre-wrap">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="v56-glass premium-border p-10 text-center space-y-6 rounded-3xl bg-primary/5">
          <h2 className="text-2xl font-bold">Still have questions?</h2>
          <p className="text-muted-foreground">
            Our support team is available 24/7 to help you with any inquiries.
          </p>
          <div className="flex justify-center gap-4">
            <a href="/contact" className="px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-opacity">
              Contact Support
            </a>
            <a href="/support" className="px-8 py-3 bg-secondary text-secondary-foreground font-bold rounded-xl hover:bg-secondary/80 transition-colors">
              Submit Ticket
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
