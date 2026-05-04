import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getAnnouncements } from '@/services/api';
import { supabase } from '@/services/supabase';
import { Megaphone, Calendar, ArrowRight, ArrowLeft, Video } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import DOMPurify from 'dompurify';
import 'react-quill-new/dist/quill.snow.css';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export default function AnnouncementsPage() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any | null>(null);

  useEffect(() => {
    loadAnnouncements();

    // Setup realtime subscription
    const channel = supabase
      .channel('announcements_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'announcements',
        filter: 'status=eq.published'
      }, () => {
        loadAnnouncements();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const data = await getAnnouncements();
      setAnnouncements(data);
    } catch (error) {
      console.error('Failed to load announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-black v56-gradient-text tracking-tight flex items-center gap-3">
              <Megaphone className="h-8 w-8 text-primary" />
              Platform <span className="text-foreground">Announcements</span>
            </h1>
            <p className="text-muted-foreground uppercase font-bold tracking-widest text-xs opacity-60">
              Latest releases, updates, and posters from Gold X Usdt
            </p>
          </div>
        </div>
      </div>

      {loading && announcements.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse bg-muted h-64 rounded-2xl border-white/5" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed border-white/10">
          <Megaphone className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
          <p className="text-muted-foreground">No announcements at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {announcements.map((ann) => (
            <Card 
              key={ann.id} 
              className="v56-glass premium-border hover:border-primary/40 transition-all group cursor-pointer overflow-hidden rounded-2xl flex flex-col"
              onClick={() => setSelectedAnnouncement(ann)}
            >
              {ann.image_urls && ann.image_urls.length > 0 ? (
                <div className="aspect-video w-full overflow-hidden relative">
                  <img 
                    src={ann.image_urls[0]} 
                    alt={ann.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  {ann.image_urls.length > 1 && (
                    <Badge className="absolute bottom-4 right-4 bg-black/60 text-white border-none text-[8px] font-black uppercase">
                      +{ann.image_urls.length - 1} More
                    </Badge>
                  )}
                  {ann.video_url && (
                    <div className="absolute top-4 right-4 bg-primary rounded-full p-2 shadow-glow">
                      <Video className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ) : ann.image_url ? (
                <div className="aspect-video w-full overflow-hidden relative">
                  <img 
                    src={ann.image_url} 
                    alt={ann.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
              ) : null}
              <CardHeader className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest border-primary/20 bg-primary/10 text-primary">
                    {ann.type || 'Announcement'}
                  </Badge>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(ann.published_at), 'MMM dd, yyyy')}
                  </div>
                </div>
                <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors line-clamp-2">
                  {ann.title}
                </CardTitle>
                <CardDescription className="line-clamp-3 mt-2 text-sm">
                  {ann.content.replace(/<[^>]*>/g, '')}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-6 flex justify-end">
                <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest group-hover:gap-3 transition-all">
                  Read More
                  <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Announcement Detail Dialog */}
      <Dialog open={!!selectedAnnouncement} onOpenChange={() => setSelectedAnnouncement(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto v56-glass premium-border p-0 gap-0">
          <div className="space-y-0">
            {selectedAnnouncement?.video_url && (
              <div className="w-full aspect-video overflow-hidden">
                <iframe
                  src={selectedAnnouncement.video_url.replace('watch?v=', 'embed/')}
                  className="w-full h-full"
                  allowFullScreen
                />
              </div>
            )}
            {selectedAnnouncement?.image_urls && selectedAnnouncement.image_urls.length > 0 ? (
              <div className="grid grid-cols-1 gap-1">
                {selectedAnnouncement.image_urls.map((url: string, i: number) => (
                  <div key={i} className="w-full">
                    <img 
                      src={url} 
                      alt="" 
                      className="w-full h-auto object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : selectedAnnouncement?.image_url ? (
              <div className="w-full aspect-video overflow-hidden">
                <img 
                  src={selectedAnnouncement.image_url} 
                  alt={selectedAnnouncement.title} 
                  className="w-full h-full object-cover"
                />
              </div>
            ) : null}
          </div>
          <div className="p-6 md:p-8 space-y-6">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest border-primary/20 bg-primary/10 text-primary">
                  {selectedAnnouncement?.type || 'Announcement'}
                </Badge>
                <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {selectedAnnouncement && format(new Date(selectedAnnouncement.published_at), 'MMMM dd, yyyy HH:mm')}
                </div>
              </div>
              <DialogTitle className="text-3xl font-black v56-gradient-text tracking-tight">
                {selectedAnnouncement?.title}
              </DialogTitle>
            </DialogHeader>
            <DialogDescription className="text-foreground text-lg leading-relaxed whitespace-pre-wrap">
              <div className="ql-editor p-0" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedAnnouncement?.content || '') }} />
            </DialogDescription>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
