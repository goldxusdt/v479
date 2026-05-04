import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  createAnnouncement, 
  updateAnnouncement, 
  getAnnouncementById 
} from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Save, 
  Send, 
  Image as ImageIcon, 
  Loader2, 
  X,
  Plus,
  Settings,
  Video,
  Eye,
  Megaphone,
  RefreshCw,
  Edit
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/services/supabase';
import DOMPurify from 'dompurify';
import { cn } from '@/utils/utils';

export default function AdminAnnouncementEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [previewMode, setPreviewMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState<any>({
    title: '',
    content: '',
    type: 'update',
    category: 'Updates',
    target_audience: 'all',
    status: 'published',
    image_urls: [] as string[],
    video_url: '',
    published_at: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm'),
  });

  useEffect(() => {
    const loadInitialData = async () => {
      if (!isEditing) return;
      
      try {
        const { data: ann, error } = await getAnnouncementById(id!);
        
        if (ann && !error) {
          setFormData({
            title: ann.title || '',
            content: ann.content || '',
            type: ann.type || 'update',
            category: ann.category || 'Updates',
            target_audience: ann.target_audience || 'all',
            status: ann.status || 'published',
            image_urls: Array.isArray(ann.image_urls) ? ann.image_urls : (ann.image_url ? [ann.image_url] : []),
            video_url: ann.video_url || '',
            published_at: ann.published_at 
              ? format(new Date(ann.published_at), 'yyyy-MM-dd\'T\'HH:mm') 
              : format(new Date(), 'yyyy-MM-dd\'T\'HH:mm'),
          });
        } else {
          toast.error('Announcement not found');
          navigate('/admin/announcements');
        }
      } catch (error) {
        console.error('Failed to load announcement data:', error);
        toast.error('Failed to load data');
      } finally {
        setInitialLoading(false);
      }
    };

    loadInitialData();
  }, [id, isEditing, navigate]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(10);

    const newUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `posters/${fileName}`;

        setUploadProgress(Math.floor(10 + (i / files.length) * 80));

        const { error: uploadError } = await supabase.storage
          .from('announcements')
          .upload(filePath, file, {
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('announcements')
          .getPublicUrl(filePath);

        newUrls.push(publicUrl);
      }

      setFormData((prev: any) => ({ 
        ...prev, 
        image_urls: [...(prev.image_urls || []), ...newUrls] 
      }));
      setUploadProgress(100);
      toast.success(`${files.length} image(s) uploaded successfully`);
    } catch (error: unknown) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image: ' + (error as any).message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      image_urls: prev.image_urls.filter((_: any, i: number) => i !== index)
    }));
  };

  const handleSave = async (statusOverride?: string) => {
    if (!formData.title || !formData.content) {
      toast.error('Title and content are required');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        ...formData,
        status: statusOverride || formData.status,
        created_by: user?.id,
        published_at: new Date(formData.published_at).toISOString(),
      };

      if (isEditing) {
        const { error } = await updateAnnouncement(id!, payload);
        if (error) throw error;
        toast.success('Announcement updated successfully');
      } else {
        const { error } = await createAnnouncement(payload);
        if (error) throw error;
        toast.success('Announcement published successfully');
      }
      navigate('/admin/announcements');
    } catch (error: unknown) {
      console.error('Error saving announcement:', error);
      toast.error((error as any).message || 'Failed to save announcement');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Initializing editor...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/announcements')} className="hover:bg-white/10 rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black v56-gradient-text tracking-tight uppercase italic flex items-center gap-2">
              <Megaphone className="h-8 w-8" />
              {isEditing ? 'Edit' : 'New'} <span className="text-foreground">Announcement</span>
            </h1>
            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest opacity-60">
              {isEditing ? 'Update announcement details' : 'Draft a new platform release or update'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button 
            variant="outline" 
            className="v56-glass border-white/10 flex-1 md:flex-none h-10 px-6 rounded-xl font-black uppercase tracking-widest text-[10px]"
            onClick={() => handleSave('draft')}
            disabled={loading}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button 
            className="premium-gradient flex-1 md:flex-none h-10 px-6 rounded-xl font-black uppercase tracking-widest text-[10px]"
            onClick={() => handleSave('published')}
            disabled={loading}
          >
            <Send className="h-4 w-4 mr-2" />
            {isEditing ? 'Update & Publish' : 'Publish Now'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="v56-glass premium-border">
            <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 bg-primary/5">
              <div>
                <CardTitle className="text-xl font-bold uppercase italic tracking-tight">Announcement Content</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Main message for your users</CardDescription>
              </div>
              <Button 
                variant={previewMode ? "default" : "outline"} 
                size="sm" 
                onClick={() => setPreviewMode(!previewMode)}
                className="text-[9px] uppercase font-black h-8 px-4 rounded-lg"
              >
                {previewMode ? <><Edit className="h-3 w-3 mr-2" /> Editor</> : <><Eye className="h-3 w-3 mr-2" /> Preview</>}
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              {previewMode ? (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="space-y-4">
                    {formData.video_url && (
                      <div className="rounded-2xl overflow-hidden border border-white/10 aspect-video bg-black/40 shadow-2xl">
                        <iframe
                          src={formData.video_url.replace('watch?v=', 'embed/')}
                          className="w-full h-full"
                          allowFullScreen
                        />
                      </div>
                    )}
                    {formData.image_urls && formData.image_urls.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {formData.image_urls.map((url: string, i: number) => (
                          <div key={i} className="rounded-2xl overflow-hidden border border-white/10 aspect-video bg-black/40 shadow-xl">
                            <img src={url} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-primary/20 text-primary border-primary/20 uppercase font-black text-[10px]">
                          {formData.type}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                          {format(new Date(formData.published_at), 'MMMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                      <h2 className="text-3xl font-black uppercase italic tracking-tight">{formData.title || 'Untitled Announcement'}</h2>
                    </div>
                    <div 
                      className="prose prose-invert max-w-none text-muted-foreground text-sm leading-relaxed ql-editor !p-0"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formData.content || '<p class="italic opacity-50">No content provided...</p>') }}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Announcement Title</Label>
                    <Input 
                      id="title" 
                      value={formData.title} 
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Major Platform Update 2.0"
                      className="h-14 text-xl font-black bg-black/20 border-white/10 rounded-2xl italic tracking-tight"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Message Content</Label>
                    <div className="bg-black/20 border border-white/10 rounded-2xl overflow-hidden min-h-[400px]">
                      <ReactQuill 
                        theme="snow" 
                        value={formData.content} 
                        onChange={(val: string) => setFormData((prev: any) => ({ ...prev, content: val }))}
                        className="h-[350px] mb-12 text-white"
                        modules={{
                          toolbar: [
                            [{ 'header': [1, 2, 3, false] }],
                            ['bold', 'italic', 'underline', 'strike'],
                            ['blockquote', 'code-block'],
                            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                            ['link'],
                            ['clean']
                          ],
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="v56-glass premium-border">
            <Tabs defaultValue="logistics">
              <CardHeader className="pb-0 bg-primary/5">
                <TabsList className="bg-black/40 border border-white/5 p-1 rounded-xl">
                  <TabsTrigger value="logistics" className="data-[state=active]:bg-primary rounded-lg text-[10px] font-black uppercase tracking-widest px-4">
                    <Settings className="h-3 w-3 mr-2" />
                    Targeting & Status
                  </TabsTrigger>
                  <TabsTrigger value="media" className="data-[state=active]:bg-primary rounded-lg text-[10px] font-black uppercase tracking-widest px-4">
                    <Video className="h-3 w-3 mr-2" />
                    Media Assets
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              
              <CardContent className="pt-6">
                <TabsContent value="logistics" className="space-y-6 m-0 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Announcement Type</Label>
                      <Select value={formData.type} onValueChange={(v: string) => setFormData({ ...formData, type: v })}>
                        <SelectTrigger className="h-12 bg-black/20 border-white/10 rounded-xl">
                          <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-white/10">
                          <SelectItem value="blog">Blog Post</SelectItem>
                          <SelectItem value="poster">Poster/Visual</SelectItem>
                          <SelectItem value="offer">Special Offer</SelectItem>
                          <SelectItem value="new_feature">New Feature</SelectItem>
                          <SelectItem value="update">Platform Update</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Category</Label>
                      <Select value={formData.category} onValueChange={(v: string) => setFormData({ ...formData, category: v })}>
                        <SelectTrigger className="h-12 bg-black/20 border-white/10 rounded-xl">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-white/10">
                          <SelectItem value="Coupons">Coupons</SelectItem>
                          <SelectItem value="Updates">Updates</SelectItem>
                          <SelectItem value="Posters">Posters</SelectItem>
                          <SelectItem value="Releases">Releases</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Target Audience</Label>
                      <Select value={formData.target_audience} onValueChange={(v: string) => setFormData({ ...formData, target_audience: v })}>
                        <SelectTrigger className="h-12 bg-black/20 border-white/10 rounded-xl">
                          <SelectValue placeholder="Select Audience" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-white/10">
                          <SelectItem value="all">All Users</SelectItem>
                          <SelectItem value="investors">Active Investors</SelectItem>
                          <SelectItem value="admins">Admins Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Publication Date & Time</Label>
                      <Input
                        type="datetime-local"
                        value={formData.published_at}
                        onChange={(e) => setFormData({ ...formData, published_at: e.target.value })}
                        className="h-12 bg-black/20 border-white/10 rounded-xl"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="media" className="space-y-6 m-0 animate-in fade-in duration-300">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <ImageIcon className="h-3 w-3 text-primary" />
                          Gallery Images (Multiple)
                        </span>
                      </Label>
                      <div className="relative">
                        <Input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          disabled={uploading}
                        />
                        <Button 
                          variant="outline" 
                          className="h-20 w-full border-dashed border-white/10 rounded-2xl bg-primary/5 hover:bg-primary/10 flex flex-col gap-2"
                          disabled={uploading}
                        >
                          {uploading ? (
                            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                          ) : (
                            <Plus className="h-6 w-6 text-primary" />
                          )}
                          <span className="text-[9px] uppercase font-black tracking-[0.2em]">{uploading ? 'Uploading...' : 'Click or Drop images here'}</span>
                        </Button>
                      </div>
                      {uploading && (
                        <div className="space-y-1">
                          <Progress value={uploadProgress} className="h-1" />
                        </div>
                      )}
                      {formData.image_urls && formData.image_urls.length > 0 && (
                        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3 mt-4">
                          {formData.image_urls.map((url: string, i: number) => (
                            <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group shadow-lg">
                              <img src={url} alt="" className="w-full h-full object-cover" />
                              <button
                                onClick={() => removeImage(i)}
                                className="absolute top-1 right-1 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3 text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 pt-4">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground flex items-center gap-2">
                        <Video className="h-3 w-3 text-primary" />
                        Video Embed URL (YouTube/Vimeo)
                      </Label>
                      <Input
                        value={formData.video_url}
                        onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                        className="h-12 bg-black/20 border-white/10 rounded-xl text-xs"
                        placeholder="https://www.youtube.com/watch?v=..."
                      />
                    </div>
                  </div>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="v56-glass premium-border overflow-hidden">
            <CardHeader className="pb-3 bg-primary/5 border-b border-white/5">
              <CardTitle className="text-xs font-black uppercase tracking-widest">Main Poster</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-black/40 border border-white/10 relative group shadow-2xl">
                {formData.image_urls && formData.image_urls.length > 0 ? (
                  <>
                    <img src={formData.image_urls[0]} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white">First Gallery Image used as Cover</p>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground opacity-30">
                    <ImageIcon className="h-12 w-12" />
                    <span className="text-[9px] font-black uppercase tracking-widest">No Cover Selected</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="v56-glass premium-border">
            <CardHeader className="pb-3 bg-primary/5 border-b border-white/5">
              <CardTitle className="text-xs font-black uppercase tracking-widest">Status & Visibility</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Publication Status</Label>
                <Select value={formData.status} onValueChange={(v: string) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className="h-12 bg-black/20 border-white/10 rounded-xl">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-white/10">
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground">Summary</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="opacity-60">Status:</span>
                    <span className={cn(formData.status === 'published' ? 'text-green-500' : 'text-yellow-500')}>
                      {formData.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="opacity-60">Target:</span>
                    <span>{formData.target_audience.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
