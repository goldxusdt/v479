import { useState, useEffect, useCallback } from 'react';
import { getMediaLibrary, uploadMedia, deleteMedia } from '@/services/api';
import { MediaFile } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  Upload, 
  Trash2, 
  Search, 
  Image as ImageIcon, 
  Copy, 
  Check, 
  Loader2,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface MediaManagerProps {
  onSelect?: (url: string) => void;
  allowSelection?: boolean;
}

export default function MediaManager({ onSelect, allowSelection = false }: MediaManagerProps) {
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const limit = 20;

  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true);
      const { data, count } = await getMediaLibrary(limit, page * limit);
      setMedia(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Failed to fetch media:', error);
      toast.error('Failed to load media library');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`File ${file.name} exceeds 5MB limit`);
          continue;
        }
        await uploadMedia(file);
      }
      toast.success('Upload complete');
      setPage(0);
      fetchMedia();
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDelete = async (id: string, path: string) => {
    if (!confirm('Are you sure you want to delete this image? This cannot be undone.')) return;

    try {
      const { error } = await deleteMedia(id, path);
      if (error) throw error;
      toast.success('Image deleted');
      fetchMedia();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete image');
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard');
  };

  const filteredMedia = media.filter(item => 
    item.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.alt_text && item.alt_text.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search images..." 
            className="pl-9 v56-glass"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Input 
            type="file" 
            id="media-upload" 
            className="hidden" 
            multiple 
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
          />
          <Button 
            asChild 
            variant="outline" 
            className="v56-glass border-primary/20 w-full md:w-auto"
            disabled={uploading}
          >
            <label htmlFor="media-upload" className="cursor-pointer flex items-center gap-2">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? 'Uploading...' : 'Upload Images'}
            </label>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {loading && media.length === 0 ? (
          Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-square bg-muted animate-pulse rounded-xl" />
          ))
        ) : filteredMedia.length > 0 ? (
          filteredMedia.map((item) => (
            <Card 
              key={item.id} 
              className={`group relative overflow-hidden border-none bg-card/50 backdrop-blur-sm transition-all hover:ring-2 hover:ring-primary/50 cursor-pointer ${selectedId === item.id ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedId(item.id)}
            >
              <div className="aspect-square overflow-hidden bg-black/20">
                <img 
                  src={item.file_path} 
                  alt={item.alt_text || item.original_filename} 
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
              
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                {allowSelection && (
                  <Button 
                    size="sm" 
                    className="w-full text-[10px] h-7 font-bold uppercase"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect?.(item.file_path);
                    }}
                  >
                    Select
                  </Button>
                )}
                <div className="flex gap-1 w-full">
                  <Button 
                    size="icon" 
                    variant="secondary" 
                    className="h-7 w-7 bg-white/10 hover:bg-white/20 border-white/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyUrl(item.file_path);
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="destructive" 
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id, item.file_path);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {selectedId === item.id && (
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-lg">
                  <Check className="h-3 w-3" />
                </div>
              )}

              <div className="p-2 truncate text-[10px] font-medium text-muted-foreground bg-black/40">
                {item.original_filename}
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-muted-foreground gap-4">
            <ImageIcon className="h-12 w-12 opacity-20" />
            <p>No images found in library</p>
          </div>
        )}
      </div>

      {totalCount > limit && (
        <div className="flex justify-center gap-2 pt-4">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page === 0} 
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <div className="flex items-center px-4 text-xs font-medium">
            Page {page + 1} of {Math.ceil(totalCount / limit)}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={(page + 1) * limit >= totalCount} 
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export function MediaSelectorDialog({ 
  open, 
  onOpenChange, 
  onSelect 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
}) {
  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col v56-glass border-primary/20">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Select Image
          </h2>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 scrollbar-thin">
          <MediaManager 
            allowSelection 
            onSelect={(url) => {
              onSelect(url);
              onOpenChange(false);
            }} 
          />
        </div>
      </Card>
    </div>
  );
}
