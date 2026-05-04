import { Plus, Trash2, Edit } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/services/supabase';

interface Tutorial {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  file_url: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

export default function AdminTutorialsPage() {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTutorial, setEditingTutorial] = useState<Tutorial | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    thumbnail_url: '',
    order_index: 0
  });

  useEffect(() => {
    loadTutorials();
  }, []);

  const loadTutorials = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tutorials')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;
      setTutorials(data || []);
    } catch (error) {
      console.error('Failed to load tutorials:', error);
      toast.error('Failed to load tutorials');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingTutorial) {
        // Update existing tutorial - use any to bypass type checking
        await (supabase.from('tutorials') as any).update({
          title: formData.title,
          description: formData.description || null,
          video_url: formData.video_url || null,
          thumbnail_url: formData.thumbnail_url || null,
          order_index: formData.order_index,
          updated_at: new Date().toISOString()
        }).eq('id', editingTutorial.id);

        toast.success('Tutorial updated successfully');
      } else {
        // Create new tutorial - use any to bypass type checking
        await (supabase.from('tutorials') as any).insert({
          title: formData.title,
          description: formData.description || null,
          video_url: formData.video_url || null,
          thumbnail_url: formData.thumbnail_url || null,
          order_index: formData.order_index,
          is_active: true
        });

        toast.success('Tutorial created successfully');
      }

      setDialogOpen(false);
      setEditingTutorial(null);
      setFormData({
        title: '',
        description: '',
        video_url: '',
        thumbnail_url: '',
        order_index: 0
      });
      loadTutorials();
    } catch (error) {
      console.error('Failed to save tutorial:', error);
      toast.error('Failed to save tutorial');
    }
  };

  const handleEdit = (tutorial: Tutorial) => {
    setEditingTutorial(tutorial);
    setFormData({
      title: tutorial.title,
      description: tutorial.description || '',
      video_url: tutorial.video_url || '',
      thumbnail_url: tutorial.thumbnail_url || '',
      order_index: tutorial.order_index
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase
        .from('tutorials')
        .delete()
        .eq('id', id);

      toast.success('Tutorial deleted successfully');
      loadTutorials();
    } catch (error) {
      console.error('Failed to delete tutorial:', error);
      toast.error('Failed to delete tutorial');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await (supabase.from('tutorials') as any).update({ is_active: !currentStatus }).eq('id', id);

      toast.success(`Tutorial ${!currentStatus ? 'activated' : 'deactivated'}`);
      loadTutorials();
    } catch (error) {
      console.error('Failed to toggle tutorial status:', error);
      toast.error('Failed to update tutorial status');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold v56-gradient-text">Tutorial Management</h1>
          <p className="text-muted-foreground">Manage deposit page tutorials</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingTutorial(null);
            setFormData({
              title: '',
              description: '',
              video_url: '',
              thumbnail_url: '',
              order_index: 0
            });
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Tutorial
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl duration-0 animate-none fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]">
            <DialogHeader>
              <DialogTitle>{editingTutorial ? 'Edit Tutorial' : 'Add New Tutorial'}</DialogTitle>
              <DialogDescription>
                {editingTutorial ? 'Update tutorial information' : 'Create a new tutorial for the deposit page'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Tutorial title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tutorial description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="video_url">Video URL</Label>
                <Input
                  id="video_url"
                  type="url"
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                />
                <p className="text-xs text-muted-foreground">
                  YouTube, Vimeo, or direct video URL
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
                <Input
                  id="thumbnail_url"
                  type="url"
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                  placeholder="https://example.com/thumbnail.jpg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="order_index">Display Order</Label>
                <Input
                  id="order_index"
                  type="number"
                  value={formData.order_index}
                  onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  min="0"
                />
                <p className="text-xs text-muted-foreground">
                  Lower numbers appear first
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTutorial ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <Card className="v56-glass">
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Loading tutorials...</p>
          </CardContent>
        </Card>
      ) : tutorials.length === 0 ? (
        <Card className="v56-glass">
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">No tutorials found. Create your first tutorial!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tutorials.map((tutorial) => (
            <Card key={tutorial.id} className={`v56-glass premium-border ${!tutorial.is_active ? 'opacity-60' : ''}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{tutorial.title}</CardTitle>
                    <CardDescription className="mt-1">
                      Order: {tutorial.order_index}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(tutorial)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="duration-0 animate-none fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Tutorial</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this tutorial? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(tutorial.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {tutorial.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {tutorial.description}
                  </p>
                )}
                {tutorial.video_url && (
                  <p className="text-xs text-primary truncate">
                    📹 {tutorial.video_url}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant={tutorial.is_active ? 'outline' : 'default'}
                    size="sm"
                    className="flex-1"
                    onClick={() => toggleActive(tutorial.id, tutorial.is_active)}
                  >
                    {tutorial.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
