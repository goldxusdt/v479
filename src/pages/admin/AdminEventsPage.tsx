import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEvents, deleteEvent } from '@/services/api';
import { EventListing } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye, 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminEventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await getEvents({ status: 'all' });
      setEvents(data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const { error } = await deleteEvent(id);
      if (error) throw error;
      toast.success('Event deleted successfully');
      fetchEvents();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete event');
    }
  };

  const filteredEvents = events.filter(event => 
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold v56-gradient-text">Event Management</h1>
          <p className="text-muted-foreground">Manage your platform's webinars, seminars and meetups</p>
        </div>
        
        <Button onClick={() => navigate('/admin/events/new')} className="v56-primary-btn w-full md:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Schedule New Event
        </Button>
      </div>

      <Card className="v56-glass border-primary/10">
        <CardHeader className="pb-3 border-b border-white/5">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Event Listings
            </CardTitle>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search events..." 
                className="pl-9 bg-black/20 border-white/10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="text-left p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Event</th>
                  <th className="text-left p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Date & Time</th>
                  <th className="text-left p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Location</th>
                  <th className="text-left p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Status</th>
                  <th className="text-right p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary/20" /></td>
                    </tr>
                  ))
                ) : filteredEvents.length > 0 ? (
                  filteredEvents.map((event) => {
                    const eventDateTime = new Date(`${event.event_date}T${event.event_time}`);
                    const isPast = eventDateTime < new Date();
                    
                    return (
                      <tr key={event.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted shrink-0">
                              {event.featured_image_url ? (
                                <img src={event.featured_image_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <ImageIcon className="h-full w-full p-2 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold line-clamp-1">{event.title}</p>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{event.category || 'General'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col text-xs">
                            <span className="font-bold">{format(new Date(event.event_date), 'MMM dd, yyyy')}</span>
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {event.event_time} ({event.timezone})
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 text-primary" />
                            {event.location}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            <Badge className={`text-[10px] uppercase font-bold tracking-widest ${
                              event.status === 'published' 
                                ? 'bg-green-500/20 text-green-500 border-green-500/20' 
                                : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20'
                            }`}>
                              {event.status}
                            </Badge>
                            {isPast && (
                              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest bg-red-500/10 text-red-500 border-red-500/20">
                                Past Event
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="v56-glass border-white/10">
                              <DropdownMenuItem onClick={() => navigate(`/events/${event.slug}`)} className="cursor-pointer">
                                <Eye className="h-4 w-4 mr-2" /> View Public
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/admin/events/edit/${event.id}`)} className="cursor-pointer">
                                <Edit className="h-4 w-4 mr-2" /> Edit Event
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDelete(event.id)} 
                                className="text-destructive focus:text-destructive cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-20 text-center text-muted-foreground">
                      <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-10" />
                      <p>No events found</p>
                      <Button variant="link" onClick={() => navigate('/admin/events/new')} className="mt-2">
                        Schedule your first event
                      </Button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
