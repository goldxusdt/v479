import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  getBlogPosts, 
  createBlogPost, 
  updateBlogPost, 
  getBlogCategories, 
  getBlogTags 
} from '@/services/api';
import { BlogPost, BlogCategory, BlogTag } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Save, 
  Send, 
  Loader2, 
  X,
  Plus,
  Settings,
  Globe,
  Tag as TagIcon
} from 'lucide-react';
import { toast } from 'sonner';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { MediaSelectorDialog } from '@/components/admin/MediaManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminBlogEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);

  const [formData, setFormData] = useState<Partial<BlogPost>>({
    title: '',
    slug: '',
    author: '',
    publication_date: new Date().toISOString().split('T')[0],
    featured_image_url: '',
    content_body: '',
    excerpt: '',
    status: 'draft',
    language: 'en',
    seo_meta_title: '',
    seo_meta_description: ''
  });

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [cats, tgs] = await Promise.all([
          getBlogCategories(),
          getBlogTags()
        ]);
        setCategories(cats);
        setTags(tgs);

        if (isEditing) {
          // Since getBlogPostBySlug is for slugs, we need a way to get by ID or find in all posts
          const allPosts = await getBlogPosts({ status: 'all' });
          const post = allPosts.find((p: BlogPost) => p.id === id);
          
          if (post) {
            setFormData({
              ...post,
              publication_date: new Date(post.publication_date).toISOString().split('T')[0]
            });
            setSelectedCategoryIds(post.blog_post_categories?.map((c: any) => c.blog_categories.id) || []);
            setSelectedTagIds(post.blog_post_tags?.map((t: any) => t.blog_tags.id) || []);
          } else {
            toast.error('Post not found');
            navigate('/admin/blog');
          }
        }
      } catch (error) {
        console.error('Failed to load editor data:', error);
        toast.error('Failed to load data');
      } finally {
        setInitialLoading(false);
      }
    };

    loadInitialData();
  }, [id, isEditing, navigate]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData(prev => ({
      ...prev,
      title,
      slug: prev.slug === generateSlug(prev.title || '') ? generateSlug(title) : prev.slug
    }));
  };

  const handleSubmit = async (status: 'draft' | 'published') => {
    if (!formData.title || !formData.content_body || !formData.author) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const postData = {
        ...formData,
        status,
        updated_at: new Date().toISOString()
      };

      if (isEditing) {
        await updateBlogPost(id!, postData, selectedCategoryIds, selectedTagIds);
        toast.success('Post updated successfully');
      } else {
        await createBlogPost(postData, selectedCategoryIds, selectedTagIds);
        toast.success('Post created successfully');
      }
      navigate('/admin/blog');
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Failed to save post');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Initializing editor...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/blog')} className="hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold v56-gradient-text">{isEditing ? 'Edit Post' : 'New Post'}</h1>
            <p className="text-muted-foreground">{isEditing ? 'Update your article content' : 'Create a new article for your platform'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button 
            variant="outline" 
            className="v56-glass border-white/10 flex-1 md:flex-none"
            onClick={() => handleSubmit('draft')}
            disabled={loading}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button 
            className="v56-primary-btn flex-1 md:flex-none"
            onClick={() => handleSubmit('published')}
            disabled={loading}
          >
            <Send className="h-4 w-4 mr-2" />
            {isEditing ? 'Update & Publish' : 'Publish Article'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="v56-glass border-primary/10">
            <CardHeader>
              <CardTitle>Content Body</CardTitle>
              <CardDescription>The main body of your article with rich text formatting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Post Title</Label>
                <Input 
                  id="title" 
                  value={formData.title} 
                  onChange={handleTitleChange}
                  placeholder="Enter a compelling title..."
                  className="h-12 text-lg font-bold bg-black/20 border-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Article Content</Label>
                <div className="v56-glass border-white/10 rounded-xl overflow-hidden min-h-[400px]">
                  <ReactQuill 
                    theme="snow" 
                    value={formData.content_body} 
                    onChange={(val) => setFormData(prev => ({ ...prev, content_body: val }))}
                    className="h-[350px]"
                    modules={{
                      toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        ['blockquote', 'code-block'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        ['link', 'image'],
                        ['clean']
                      ],
                    }}
                  />
                </div>
              </div>
              
              <div className="space-y-2 pt-10">
                <Label htmlFor="excerpt" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Excerpt / Summary</Label>
                <textarea 
                  id="excerpt" 
                  rows={3}
                  value={formData.excerpt || ''} 
                  onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="A short summary for the list view..."
                  className="w-full rounded-xl p-3 bg-black/20 border border-white/10 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="v56-glass border-primary/10">
            <Tabs defaultValue="settings">
              <CardHeader className="pb-0">
                <TabsList className="bg-black/40 border border-white/5 p-1">
                  <TabsTrigger value="settings" className="data-[state=active]:bg-primary">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </TabsTrigger>
                  <TabsTrigger value="seo" className="data-[state=active]:bg-primary">
                    <Globe className="h-4 w-4 mr-2" />
                    SEO Optimization
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              
              <CardContent className="pt-6">
                <TabsContent value="settings" className="space-y-4 m-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="slug" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">URL Slug</Label>
                      <Input 
                        id="slug" 
                        value={formData.slug} 
                        onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                        className="bg-black/20 border-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="author" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Author Name</Label>
                      <Input 
                        id="author" 
                        value={formData.author} 
                        onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                        className="bg-black/20 border-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Publication Date</Label>
                      <Input 
                        id="date" 
                        type="date"
                        value={formData.publication_date} 
                        onChange={(e) => setFormData(prev => ({ ...prev, publication_date: e.target.value }))}
                        className="bg-black/20 border-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="language" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Language</Label>
                      <Select 
                        value={formData.language} 
                        onValueChange={(val) => setFormData(prev => ({ ...prev, language: val }))}
                      >
                        <SelectTrigger className="bg-black/20 border-white/10">
                          <SelectValue placeholder="Select Language" />
                        </SelectTrigger>
                        <SelectContent className="v56-glass border-white/10">
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="ar">Arabic</SelectItem>
                          <SelectItem value="hi">Hindi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="seo" className="space-y-4 m-0">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="seo_title" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Meta Title</Label>
                      <Input 
                        id="seo_title" 
                        value={formData.seo_meta_title || ''} 
                        onChange={(e) => setFormData(prev => ({ ...prev, seo_meta_title: e.target.value }))}
                        placeholder="Default is post title"
                        className="bg-black/20 border-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="seo_desc" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Meta Description</Label>
                      <textarea 
                        id="seo_desc" 
                        rows={3}
                        value={formData.seo_meta_description || ''} 
                        onChange={(e) => setFormData(prev => ({ ...prev, seo_meta_description: e.target.value }))}
                        placeholder="Default is content excerpt"
                        className="w-full rounded-xl p-3 bg-black/20 border border-white/10 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                      />
                    </div>
                  </div>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="v56-glass border-primary/10 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Featured Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/5 relative group">
                {formData.featured_image_url ? (
                  <>
                    <img src={formData.featured_image_url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setShowMediaSelector(true)}>Replace</Button>
                      <Button size="sm" variant="destructive" onClick={() => setFormData(prev => ({ ...prev, featured_image_url: '' }))}>Remove</Button>
                    </div>
                  </>
                ) : (
                  <button 
                    onClick={() => setShowMediaSelector(true)}
                    className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-white/5 transition-colors"
                  >
                    <Plus className="h-8 w-8 opacity-20" />
                    <span className="text-xs font-bold uppercase tracking-widest">Select Image</span>
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="v56-glass border-primary/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TagIcon className="h-4 w-4 text-primary" />
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-thin pr-2">
                {categories.length > 0 ? categories.map(cat => (
                  <div key={cat.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 cursor-pointer" onClick={() => {
                    setSelectedCategoryIds(prev => 
                      prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id]
                    );
                  }}>
                    <div className={`h-4 w-4 rounded border border-primary/50 flex items-center justify-center transition-colors ${selectedCategoryIds.includes(cat.id) ? 'bg-primary' : ''}`}>
                      {selectedCategoryIds.includes(cat.id) && <X className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <span className="text-xs">{cat.name}</span>
                  </div>
                )) : (
                  <p className="text-xs text-muted-foreground italic">No categories available</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="v56-glass border-primary/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TagIcon className="h-4 w-4 text-primary" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {tags.length > 0 ? tags.map(tag => (
                  <button 
                    key={tag.id}
                    onClick={() => {
                      setSelectedTagIds(prev => 
                        prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                      );
                    }}
                    className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest border transition-all ${
                      selectedTagIds.includes(tag.id) 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-white/5 text-muted-foreground border-white/10 hover:border-primary/50'
                    }`}
                  >
                    {tag.name}
                  </button>
                )) : (
                  <p className="text-xs text-muted-foreground italic">No tags available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <MediaSelectorDialog 
        open={showMediaSelector} 
        onOpenChange={setShowMediaSelector} 
        onSelect={(url) => setFormData(prev => ({ ...prev, featured_image_url: url }))} 
      />
    </div>
  );
}
