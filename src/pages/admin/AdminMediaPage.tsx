import MediaManager from '@/components/admin/MediaManager';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ImageIcon } from 'lucide-react';

export default function AdminMediaPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold v56-gradient-text">Media Library</h1>
        <p className="text-muted-foreground">Manage your images and assets for blog posts and events</p>
      </div>

      <Card className="v56-glass border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Global Media Assets
          </CardTitle>
          <CardDescription>Upload, delete, and manage your image library</CardDescription>
        </CardHeader>
        <CardContent>
          <MediaManager />
        </CardContent>
      </Card>
    </div>
  );
}
