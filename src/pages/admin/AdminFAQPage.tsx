import { Plus, Trash, HelpCircle, Edit2, ChevronUp, ChevronDown, Save, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getGlobalFAQs, createFAQ, updateFAQ, deleteFAQ, reorderFAQs } from '@/services/api';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  is_active: boolean;
  order_position: number;
}

export default function AdminFAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'General',
    is_active: true
  });

  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    setLoading(true);
    try {
      const data = await getGlobalFAQs(false);
      setFaqs(data || []);
    } catch (error) {
      console.error('Failed to load FAQs:', error);
      toast.error('Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async () => {
    if (!formData.question || !formData.answer) {
      toast.error('Question and Answer are required');
      return;
    }

    try {
      if (editingFaq) {
        const { error } = await updateFAQ(editingFaq.id, formData);
        if (error) throw error;
        toast.success('FAQ updated successfully');
      } else {
        const { error } = await createFAQ({
          ...formData,
          order_position: faqs.length + 1
        });
        if (error) throw error;
        toast.success('FAQ created successfully');
      }
      setIsDialogOpen(false);
      setEditingFaq(null);
      setFormData({ question: '', answer: '', category: 'General', is_active: true });
      loadFAQs();
    } catch (error) {
      console.error('Failed to save FAQ:', error);
      toast.error('Failed to save FAQ');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this FAQ?')) return;
    try {
      const { error } = await deleteFAQ(id);
      if (error) throw error;
      toast.success('FAQ deleted successfully');
      loadFAQs();
    } catch (error) {
      console.error('Failed to delete FAQ:', error);
      toast.error('Failed to delete FAQ');
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const newFaqs = [...faqs];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newFaqs.length) return;

    [newFaqs[index], newFaqs[targetIndex]] = [newFaqs[targetIndex], newFaqs[index]];
    
    setFaqs(newFaqs);
    const { error } = await reorderFAQs(newFaqs.map(f => f.id));
    if (error) {
      toast.error('Failed to update order');
      loadFAQs();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold v56-gradient-text">FAQ Management</h1>
          <p className="text-muted-foreground">Manage global frequently asked questions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingFaq(null);
              setFormData({ question: '', answer: '', category: 'General', is_active: true });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add FAQ
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingFaq ? 'Edit FAQ' : 'Add New FAQ'}</DialogTitle>
              <DialogDescription>Create a question and answer pair for your users.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Investment">Investment</SelectItem>
                    <SelectItem value="Withdrawal">Withdrawal</SelectItem>
                    <SelectItem value="Network">Network</SelectItem>
                    <SelectItem value="Security">Security</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="question">Question</Label>
                <Input
                  id="question"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="e.g., How do I start investing?"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="answer">Answer</Label>
                <Textarea
                  id="answer"
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  placeholder="Provide a detailed answer..."
                  rows={5}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(val) => setFormData({ ...formData, is_active: val })}
                />
                <Label htmlFor="is_active">Active (Visible to users)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateOrUpdate}>
                <Save className="h-4 w-4 mr-2" />
                {editingFaq ? 'Update FAQ' : 'Create FAQ'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : faqs.length === 0 ? (
          <Card className="v56-glass p-12 text-center border-dashed border-2">
            <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <p className="text-muted-foreground">No FAQs found. Add your first one!</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Card key={faq.id} className="v56-glass overflow-hidden group">
                <div className="flex items-center p-4 gap-4">
                  <div className="flex flex-col gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      disabled={index === 0}
                      onClick={() => handleMove(index, 'up')}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      disabled={index === faqs.length - 1}
                      onClick={() => handleMove(index, 'down')}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {faq.category}
                      </span>
                      {!faq.is_active && (
                        <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-1">
                          <EyeOff className="h-2 w-2" />
                          Inactive
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-lg">{faq.question}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{faq.answer}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        setEditingFaq(faq);
                        setFormData({
                          question: faq.question,
                          answer: faq.answer,
                          category: faq.category,
                          is_active: faq.is_active
                        });
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(faq.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
