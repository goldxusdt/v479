import { useState } from 'react';
import { Loader2, X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/services/supabase';
import { toast } from 'sonner';

interface AssetUploaderProps {
  label: string;
  value: string;
  onUpload: (url: string) => void;
  onRemove: () => void;
  bucket?: string;
  description?: string;
  accept?: string;
}

export function AssetUploader({
  label,
  value,
  onUpload,
  onRemove,
  bucket = 'assets',
  description,
  accept = 'image/*'
}: AssetUploaderProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (1MB limit)
    if (file.size > 1024 * 1024) {
      toast.error('File size too large (max 1MB)');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        // Log failure
        await (supabase.from('upload_logs') as any).insert([{
          user_id: user?.id,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          status: 'failure',
          error_message: (error as any).message
        }]);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      // Log success
      await (supabase.from('upload_logs') as any).insert([{
        user_id: user?.id,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        status: 'success'
      }]);

      onUpload(publicUrl);
      toast.success('Asset uploaded successfully');
    } catch (error: unknown) {
      console.error('Upload error:', error);
      
      // Attempt to log failure if not already logged
      const { data: { user } } = await supabase.auth.getUser();
      await (supabase.from('upload_logs') as any).insert([{
        user_id: user?.id,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        status: 'failure',
        error_message: (error as any).message
      }]);

      toast.error(`Upload failed: ${(error as any).message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Label>{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      
      {value ? (
        <div className="relative w-full max-w-sm rounded-lg border border-primary/20 bg-accent/30 p-4 flex flex-col items-center">
          <img loading="lazy" decoding="async" src={`${value}${value.includes('?') ? '&' : '?'}v=${Date.now()}`} alt={label} className="max-h-32 mb-4 object-contain" />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open(value, '_blank')}>
              View Original
            </Button>
            <Button variant="destructive" size="sm" onClick={onRemove}>
              <X className="h-4 w-4 mr-1" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center w-full max-w-sm">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-primary/20 rounded-lg cursor-pointer bg-accent/10 hover:bg-accent/20 transition-all">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : (
                <>
                  <Upload className="w-8 h-8 mb-4 text-primary" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">{accept === 'image/*' ? 'PNG, JPG, SVG, ICO' : 'Any file'}</p>
                </>
              )}
            </div>
            <input 
              type="file" 
              className="hidden" 
              onChange={handleFileChange} 
              disabled={uploading} 
              accept={accept}
            />
          </label>
        </div>
      )}
    </div>
  );
}
