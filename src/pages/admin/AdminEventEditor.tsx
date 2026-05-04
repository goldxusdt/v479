import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  getEvents, 
  createEvent, 
  updateEvent 
} from '@/services/api';
import { EventListing } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Save, 
  Send, 
  Loader2, 
  Plus,
  Settings,
  Globe,
  MapPin,
  Link as LinkIcon,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { MediaSelectorDialog } from '@/components/admin/MediaManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminEventEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [showMediaSelector, setShowMediaSelector] = useState(false);

  const [formData, setFormData] = useState<Partial<EventListing>>({
    title: '',
    slug: '',
    description: '',
    event_date: new Date().toISOString().split('T')[0],
    event_time: '12:00',
    timezone: 'UTC',
    location: '',
    featured_image_url: '',
    registration_link: '',
    capacity: 0,
    category: 'General',
    status: 'draft',
    language: 'en',
    seo_meta_title: '',
    seo_meta_description: ''
  });

  useEffect(() => {
    const loadInitialData = async () => {
      if (!isEditing) return;
      
      try {
        const allEvents = await getEvents({ status: 'all' });
        const event = allEvents.find((e: EventListing) => e.id === id);
        
        if (event) {
          setFormData(event);
        } else {
          toast.error('Event not found');
          navigate('/admin/events');
        }
      } catch (error) {
        console.error('Failed to load event data:', error);
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
    if (!formData.title || !formData.description || !formData.location || !formData.event_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const eventData = {
        ...formData,
        status,
        updated_at: new Date().toISOString()
      };

      if (isEditing) {
        await updateEvent(id!, eventData);
        toast.success('Event updated successfully');
      } else {
        await createEvent(eventData);
        toast.success('Event scheduled successfully');
      }
      navigate('/admin/events');
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Failed to save event');
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
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/events')} className="hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold v56-gradient-text">{isEditing ? 'Edit Event' : 'New Event'}</h1>
            <p className="text-muted-foreground">{isEditing ? 'Update event details' : 'Schedule a new event for your community'}</p>
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
            {isEditing ? 'Update & Publish' : 'Publish Event'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="v56-glass border-primary/10">
            <CardHeader>
              <CardTitle>Event Information</CardTitle>
              <CardDescription>Key details about your upcoming event</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Event Title</Label>
                <Input 
                  id="title" 
                  value={formData.title} 
                  onChange={handleTitleChange}
                  placeholder="e.g. Annual Gold Investment Webinar"
                  className="h-12 text-lg font-bold bg-black/20 border-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Description</Label>
                <div className="v56-glass border-white/10 rounded-xl overflow-hidden min-h-[300px]">
                  <ReactQuill 
                    theme="snow" 
                    value={formData.description} 
                    onChange={(val) => setFormData(prev => ({ ...prev, description: val }))}
                    className="h-[250px]"
                    modules={{
                      toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        ['link'],
                        ['clean']
                      ],
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="location" 
                      value={formData.location} 
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="e.g. Zoom, Dubai Office, etc."
                      className="pl-9 bg-black/20 border-white/10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg_link" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Registration Link (Optional)</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="reg_link" 
                      value={formData.registration_link || ''} 
                      onChange={(e) => setFormData(prev => ({ ...prev, registration_link: e.target.value }))}
                      placeholder="https://..."
                      className="pl-9 bg-black/20 border-white/10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="v56-glass border-primary/10">
            <Tabs defaultValue="logistics">
              <CardHeader className="pb-0">
                <TabsList className="bg-black/40 border border-white/5 p-1">
                  <TabsTrigger value="logistics" className="data-[state=active]:bg-primary">
                    <Settings className="h-4 w-4 mr-2" />
                    Logistics
                  </TabsTrigger>
                  <TabsTrigger value="seo" className="data-[state=active]:bg-primary">
                    <Globe className="h-4 w-4 mr-2" />
                    SEO
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              
              <CardContent className="pt-6">
                <TabsContent value="logistics" className="space-y-4 m-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Event Date</Label>
                      <Input 
                        id="date" 
                        type="date"
                        value={formData.event_date} 
                        onChange={(e) => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                        className="bg-black/20 border-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Event Time</Label>
                      <Input 
                        id="time" 
                        type="time"
                        value={formData.event_time} 
                        onChange={(e) => setFormData(prev => ({ ...prev, event_time: e.target.value }))}
                        className="bg-black/20 border-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Timezone</Label>
                      <Select 
                        value={formData.timezone} 
                        onValueChange={(val) => setFormData(prev => ({ ...prev, timezone: val }))}
                      >
                        <SelectTrigger className="bg-black/20 border-white/10">
                          <SelectValue placeholder="Select Timezone" />
                        </SelectTrigger>
                        <SelectContent className="v56-glass border-white/10">
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="GMT+4">Dubai (GMT+4)</SelectItem>
                          <SelectItem value="GMT+5:30">India (GMT+5:30)</SelectItem>
                          <SelectItem value="EST">New York (EST)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="capacity" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Capacity (0 = Unlimited)</Label>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="capacity" 
                          type="number"
                          value={formData.capacity || 0} 
                          onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) }))}
                          className="pl-9 bg-black/20 border-white/10"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="seo" className="space-y-4 m-0">
                  <div className="space-y-4">
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
                      <Label htmlFor="seo_title" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Meta Title</Label>
                      <Input 
                        id="seo_title" 
                        value={formData.seo_meta_title || ''} 
                        onChange={(e) => setFormData(prev => ({ ...prev, seo_meta_title: e.target.value }))}
                        placeholder="Default is event title"
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
                        placeholder="A short summary for search results..."
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
              <CardTitle className="text-sm">General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Event Category</Label>
                <Select 
                  value={formData.category || 'General'} 
                  onValueChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
                >
                  <SelectTrigger className="bg-black/20 border-white/10">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="v56-glass border-white/10">
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Webinar">Webinar</SelectItem>
                    <SelectItem value="Seminar">Seminar</SelectItem>
                    <SelectItem value="Workshop">Workshop</SelectItem>
                    <SelectItem value="Meetup">Meetup</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lang" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Language</Label>
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
