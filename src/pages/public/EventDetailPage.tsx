import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getEventBySlug } from '@/services/api';
import { EventListing } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Clock, 
  Share2,
  ChevronRight,
  Loader2,
  Image as ImageIcon,
  ExternalLink,
  Users,
  Info
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SEOHead, generateStructuredData } from '@/utils/seo';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import { toast } from 'sonner';

export default function EventDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPast, setIsPast] = useState(false);

  const eventSchema = event ? generateStructuredData('Event', {
    name: event.title,
    description: event.description.replace(/<[^>]*>?/gm, '').substring(0, 160),
    startDate: `${event.event_date}T${event.event_time}`,
    location: {
      '@type': 'VirtualLocation',
      url: window.location.href
    },
    image: event.featured_image_url || `${window.location.origin}/logo.svg`,
    organizer: {
      '@type': 'Organization',
      name: 'Gold X Usdt',
      url: window.location.origin
    }
  }) : undefined;

  useEffect(() => {
    const loadData = async () => {
      if (!slug) return;
      
      try {
        setLoading(true);
        const data = await getEventBySlug(slug);
        
        if (data && data.status === 'published') {
          setEvent(data);
          const eventDateTime = new Date(`${data.event_date}T${data.event_time}`);
          setIsPast(eventDateTime < new Date());
        } else {
          toast.error('Event not found');
          navigate('/events');
        }
      } catch (error) {
        console.error('Failed to fetch event:', error);
        navigate('/events');
      } finally {
        setLoading(false);
      }
    };
    loadData();
    window.scrollTo(0, 0);
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="min-h-screen pt-24 pb-20">
      <SEOHead 
        title={`${event.seo_meta_title || event.title} | Gold X Usdt Events`}
        description={event.seo_meta_description || event.description.replace(/<[^>]*>?/gm, '').substring(0, 160)}
        image={event.featured_image_url || undefined}
        type="website"
        schemas={eventSchema ? [eventSchema] : []}
      />

      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground mb-8">
          <Link to="/events" className="hover:text-primary transition-colors">Events</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-primary truncate">{event.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/90 text-primary-foreground border-none text-[10px] font-bold uppercase tracking-widest px-4 py-1">
                  {event.category || 'Special Event'}
                </Badge>
                {isPast && (
                  <Badge variant="outline" className="border-red-500/50 text-red-500 text-[10px] font-bold uppercase tracking-widest">
                    Past Event
                  </Badge>
                )}
              </div>
              
              <h1 className="text-3xl md:text-5xl font-black leading-tight tracking-tighter">
                {event.title}
              </h1>
            </div>

            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-white/5 border border-white/10 shadow-2xl">
              {event.featured_image_url ? (
                <img 
                  src={event.featured_image_url} 
                  alt={event.title} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-20 w-20 text-white/5" />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                About This Event
              </h2>
              <div 
                className="prose prose-invert prose-gold max-w-none text-muted-foreground leading-relaxed text-lg ql-editor !p-0"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(event.description) }}
              />
            </div>
          </div>

          <div className="space-y-6">
            <Card className="v56-glass border-primary/20 sticky top-28 overflow-hidden">
              <div className="h-2 bg-primary" />
              <CardHeader>
                <CardTitle className="text-xl">Event Details</CardTitle>
                <CardDescription>Everything you need to know to attend</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Date</p>
                      <p className="font-bold">{format(new Date(event.event_date), 'MMMM dd, yyyy')}</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Time</p>
                      <p className="font-bold">{event.event_time} ({event.timezone})</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Location</p>
                      <p className="font-bold">{event.location}</p>
                    </div>
                  </div>

                  {event.capacity && event.capacity > 0 && (
                    <div className="flex gap-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Capacity</p>
                        <p className="font-bold">{event.capacity} Attendees</p>
                      </div>
                    </div>
                  )}
                </div>

                {!isPast && event.registration_link && (
                  <Button 
                    asChild 
                    className="w-full v56-primary-btn h-12 text-sm font-black uppercase tracking-widest"
                  >
                    <a href={event.registration_link} target="_blank" rel="noopener noreferrer">
                      Register Now
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                )}

                {isPast && (
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center space-y-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">This event has concluded</p>
                    <p className="text-[10px] text-muted-foreground">Check our events page for upcoming opportunities.</p>
                  </div>
                )}

                <div className="pt-4 border-t border-white/5 flex flex-col gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-[10px] uppercase font-bold tracking-widest hover:text-primary"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success('Event link copied!');
                    }}
                  >
                    <Share2 className="h-3 w-3 mr-2" />
                    Share Event
                  </Button>
                  <Link to="/events" className="w-full">
                    <Button variant="ghost" size="sm" className="w-full text-[10px] uppercase font-bold tracking-widest">
                      <ArrowLeft className="h-3 w-3 mr-2" />
                      Back to Events
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
