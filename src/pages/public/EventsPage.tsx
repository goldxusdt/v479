import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEvents } from '@/services/api';
import { EventListing } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  ArrowRight, 
  Search, 
  Image as ImageIcon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SEOHead } from '@/utils/seo';
import { format } from 'date-fns';

export default function EventsPage() {
  const navigate = useNavigate();
  const [upcomingEvents, setUpcomingEvents] = useState<EventListing[]>([]);
  const [pastEvents, setPastEvents] = useState<EventListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPastEvents, setShowPastEvents] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const [upcoming, past] = await Promise.all([
          getEvents({ type: 'upcoming', status: 'published' }),
          getEvents({ type: 'past', status: 'published' })
        ]);
        setUpcomingEvents(upcoming);
        setPastEvents(past);
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const filterEvents = (events: EventListing[]) => {
    return events.filter(event => 
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredUpcoming = filterEvents(upcomingEvents);
  const filteredPast = filterEvents(pastEvents);

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 md:px-8">
      <SEOHead 
        title="Gold X Usdt Events - Join Our Global Community" 
        description="Discover upcoming webinars, physical events, and workshops. Join the global Gold X Usdt community today."
      />

      <div className="max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase font-bold tracking-widest px-4 py-1">
            Community & Learning
          </Badge>
          <h1 className="text-4xl md:text-6xl font-black v56-gradient-text tracking-tighter">
            Exclusive Events
          </h1>
          <p className="text-muted-foreground text-lg">
            Connect with experts, learn investment secrets, and network with high-performing leaders across the globe.
          </p>
        </div>

        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search events by title, location or topic..." 
            className="pl-12 h-14 bg-black/20 border-white/10 rounded-2xl text-lg focus:ring-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black uppercase tracking-widest">Upcoming Events</h2>
            <div className="h-px flex-1 bg-white/5" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="v56-glass border-white/5 animate-pulse h-[400px]" />
              ))
            ) : filteredUpcoming.length > 0 ? (
              filteredUpcoming.map((event) => (
                <Card 
                  key={event.id} 
                  className="group v56-glass border-white/5 hover:border-primary/30 transition-all duration-500 overflow-hidden flex flex-col h-full cursor-pointer"
                  onClick={() => navigate(`/events/${event.slug}`)}
                >
                  <div className="aspect-[16/9] overflow-hidden relative">
                    {event.featured_image_url ? (
                      <img 
                        src={event.featured_image_url} 
                        alt={event.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-white/10" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-primary/90 text-primary-foreground border-none text-[10px] font-bold uppercase tracking-widest">
                        {event.category || 'Event'}
                      </Badge>
                    </div>
                  </div>
                  
                  <CardHeader className="flex-1 space-y-3">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(event.event_date), 'MMMM dd, yyyy')}
                      </div>
                      <CardTitle className="text-xl group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                        {event.title}
                      </CardTitle>
                    </div>
                    
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 text-primary" />
                        {event.event_time} ({event.timezone})
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 text-primary" />
                        {event.location}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0 pb-6 mt-auto">
                    <Button variant="outline" className="w-full border-white/10 group-hover:border-primary/50 group-hover:bg-primary/5 transition-all font-black uppercase text-xs tracking-widest">
                      View Details & Join
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full py-20 text-center text-muted-foreground">
                <p>No upcoming events matching your search.</p>
              </div>
            )}
          </div>
        </div>

        {pastEvents.length > 0 && (
          <div className="space-y-8 pt-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <h2 className="text-2xl font-black uppercase tracking-widest opacity-50">Past Events</h2>
                <div className="h-px flex-1 bg-white/5" />
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowPastEvents(!showPastEvents)}
                className="ml-4 text-xs font-bold uppercase tracking-widest"
              >
                {showPastEvents ? <><ChevronUp className="h-4 w-4 mr-2" /> Hide</> : <><ChevronDown className="h-4 w-4 mr-2" /> Show All ({pastEvents.length})</>}
              </Button>
            </div>

            {showPastEvents && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-700">
                {filteredPast.map((event) => (
                  <Card 
                    key={event.id} 
                    className="v56-glass border-white/5 flex flex-col h-full cursor-pointer hover:border-white/20 transition-all"
                    onClick={() => navigate(`/events/${event.slug}`)}
                  >
                    <div className="aspect-video relative overflow-hidden">
                      {event.featured_image_url && <img src={event.featured_image_url} alt="" className="w-full h-full object-cover" />}
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Badge variant="outline" className="border-white/40 text-white font-bold text-[10px] uppercase tracking-widest">Concluded</Badge>
                      </div>
                    </div>
                    <CardHeader className="p-4 space-y-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {format(new Date(event.event_date), 'MMM dd, yyyy')}
                      </p>
                      <CardTitle className="text-sm font-bold line-clamp-1">{event.title}</CardTitle>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
