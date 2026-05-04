import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBlogPosts, deleteBlogPost } from '@/services/api';
import { BlogPost } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye, 
  FileText,
  Clock,
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

export default function AdminBlogPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const data = await getBlogPosts({ status: 'all' });
      setPosts(data);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      toast.error('Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const { error } = await deleteBlogPost(id);
      if (error) throw error;
      toast.success('Post deleted successfully');
      fetchPosts();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete post');
    }
  };

  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold v56-gradient-text">Blog Management</h1>
          <p className="text-muted-foreground">Manage your platform's articles and news</p>
        </div>
        
        <Button onClick={() => navigate('/admin/blog/new')} className="v56-primary-btn w-full md:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Create New Post
        </Button>
      </div>

      <Card className="v56-glass border-primary/10">
        <CardHeader className="pb-3 border-b border-white/5">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Article Library
            </CardTitle>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search articles..." 
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
                  <th className="text-left p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Article</th>
                  <th className="text-left p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Author</th>
                  <th className="text-left p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Date</th>
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
                ) : filteredPosts.length > 0 ? (
                  filteredPosts.map((post) => (
                    <tr key={post.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted shrink-0">
                            {post.featured_image_url ? (
                              <img src={post.featured_image_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <ImageIcon className="h-full w-full p-2 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold line-clamp-1">{post.title}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{post.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest border-primary/20 bg-primary/5">
                            {post.author}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={`text-[10px] uppercase font-bold tracking-widest ${
                          post.status === 'published' 
                            ? 'bg-green-500/20 text-green-500 border-green-500/20' 
                            : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20'
                        }`}>
                          {post.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(post.publication_date), 'MMM dd, yyyy')}
                          </span>
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
                            <DropdownMenuItem onClick={() => navigate(`/blog/${post.slug}`)} className="cursor-pointer">
                              <Eye className="h-4 w-4 mr-2" /> View Public
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/admin/blog/edit/${post.id}`)} className="cursor-pointer">
                              <Edit className="h-4 w-4 mr-2" /> Edit Article
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(post.id)} 
                              className="text-destructive focus:text-destructive cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-20 text-center text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-10" />
                      <p>No blog posts found</p>
                      <Button variant="link" onClick={() => navigate('/admin/blog/new')} className="mt-2">
                        Create your first post
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

