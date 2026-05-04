import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Megaphone, Calendar, RefreshCw, Edit, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { deleteAnnouncement, getAllAnnouncementsAdmin } from '@/services/api';
import { cn } from '@/utils/utils';

export default function AdminAnnouncementsPage() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any | null>(null);


  useEffect(() => {
    loadAnnouncements();
    
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 8000);
    
    return () => clearTimeout(safetyTimeout);
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await getAllAnnouncementsAdmin();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load announcements:', error);
      toast.error('Failed to load announcements');
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    navigate('/admin/announcements/new');
  };

  const handleEdit = (ann: any) => {
    navigate(`/admin/announcements/edit/${ann.id}`);
  };

  const handleDelete = async () => {
    if (!editingAnnouncement) return;
    try {
      const { error } = await deleteAnnouncement(editingAnnouncement.id);
      if (error) throw error;
      toast.success('Announcement deleted successfully');
      setDeleteDialogOpen(false);
      loadAnnouncements();
    } catch (error: unknown) {
      console.error('Error deleting announcement:', error);
      toast.error((error as any).message || 'Failed to delete announcement');
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-xs font-bold uppercase tracking-widest opacity-50">Loading announcements...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black v56-gradient-text tracking-tight uppercase italic flex items-center gap-2">
            <Megaphone className="h-8 w-8" />
            Announcement <span className="text-foreground">Management</span>
          </h1>
          <p className="text-muted-foreground text-sm uppercase font-bold tracking-widest opacity-60">
            Create, manage and publish platform announcements and releases
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2 premium-gradient h-10 px-6 rounded-xl font-black uppercase tracking-widest text-[10px]">{"New Announcement"}</Button>
      </div>
      <Card className="v56-glass premium-border overflow-hidden">
        <CardHeader className="bg-primary/5 border-b border-white/5 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            All Announcements
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={loadAnnouncements} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="p-4 text-[10px] uppercase font-black tracking-widest text-muted-foreground">Announcement</th>
                  <th className="p-4 text-[10px] uppercase font-black tracking-widest text-muted-foreground">Type</th>
                  <th className="p-4 text-[10px] uppercase font-black tracking-widest text-muted-foreground">Status</th>
                  <th className="p-4 text-[10px] uppercase font-black tracking-widest text-muted-foreground">Published Date</th>
                  <th className="p-4 text-right text-[10px] uppercase font-black tracking-widest text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {announcements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground uppercase text-xs font-bold tracking-widest opacity-40">
                      No announcements found
                    </td>
                  </tr>
                ) : (
                  announcements.map((ann) => (
                    <tr key={ann.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {ann.image_urls && ann.image_urls.length > 0 ? (
                            <img src={ann.image_urls[0]} alt="" className="h-10 w-10 rounded-lg object-cover border border-white/10" />
                          ) : ann.image_url ? (
                            <img src={ann.image_url} alt="" className="h-10 w-10 rounded-lg object-cover border border-white/10" />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                              <Megaphone className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-sm line-clamp-1">{ann.title}</p>
                            <p className="text-[10px] text-muted-foreground line-clamp-1 opacity-60 italic">{ann.content.substring(0, 50)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="text-[9px] uppercase font-black bg-primary/5 text-primary border-primary/20">
                          {ann.type || 'update'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className={cn(
                          "text-[9px] uppercase font-black border-none px-2 h-5",
                          ann.status === 'published' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                        )}>
                          {ann.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="text-[10px] font-bold">
                          {ann.published_at ? format(new Date(ann.published_at), 'yyyy-MM-dd HH:mm') : 'N/A'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:text-primary hover:bg-primary/10"
                            onClick={() => handleEdit(ann)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            onClick={() => {
                              setEditingAnnouncement(ann);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="v56-glass premium-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black v56-gradient-text tracking-tight uppercase italic flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-bold text-xs uppercase tracking-widest">
              Are you sure you want to delete this announcement? This action is permanent and will remove it for all users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="uppercase font-black text-[10px] tracking-widest rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 uppercase font-black text-[10px] tracking-widest rounded-xl">Delete Announcement</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

