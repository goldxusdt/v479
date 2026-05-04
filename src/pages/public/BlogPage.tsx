import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBlogPosts } from '@/services/api';
import { BlogPost } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  User, 
  ArrowRight, 
  Search, 
  Image as ImageIcon
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SEOHead } from '@/utils/seo';
import { format } from 'date-fns';

export default function BlogPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const data = await getBlogPosts({ status: 'published' });
        setPosts(data);
      } catch (error) {
        console.error('Failed to fetch posts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (post.excerpt && post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 md:px-8">
      <SEOHead 
        title="Gold X Usdt Blog - Insights & Market Updates" 
        description="Stay updated with the latest news, market trends, and investment strategies from Gold X Usdt experts."
      />

      <div className="max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase font-bold tracking-widest px-4 py-1">
            Platform Insights
          </Badge>
          <h1 className="text-4xl md:text-6xl font-black v56-gradient-text tracking-tighter">
            Our Blog & News
          </h1>
          <p className="text-muted-foreground text-lg">
            Expert analysis, market updates, and everything you need to know about growing your wealth with Gold X Usdt.
          </p>
        </div>

        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search articles by title or keyword..." 
            className="pl-12 h-14 bg-black/20 border-white/10 rounded-2xl text-lg focus:ring-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="v56-glass border-white/5 animate-pulse h-[400px]">
                <div className="h-48 bg-white/5" />
                <CardHeader className="space-y-2">
                  <div className="h-4 bg-white/5 w-1/4 rounded" />
                  <div className="h-6 bg-white/5 w-3/4 rounded" />
                </CardHeader>
              </Card>
            ))
          ) : filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <Card 
                key={post.id} 
                className="group v56-glass border-white/5 hover:border-primary/30 transition-all duration-500 overflow-hidden flex flex-col h-full cursor-pointer"
                onClick={() => navigate(`/blog/${post.slug}`)}
              >
                <div className="aspect-[16/9] overflow-hidden relative">
                  {post.featured_image_url ? (
                    <img 
                      src={post.featured_image_url} 
                      alt={post.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-white/10" />
                    </div>
                  )}
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-black/60 backdrop-blur-md border-white/10 text-[10px] font-bold uppercase tracking-widest">
                      {(post as any).blog_post_categories?.[0]?.blog_categories?.name || 'Article'}
                    </Badge>
                  </div>
                </div>
                
                <CardHeader className="flex-1 space-y-3">
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-primary" />
                      {format(new Date(post.publication_date), 'MMM dd, yyyy')}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3 text-primary" />
                      {post.author}
                    </span>
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                    {post.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-3 text-sm leading-relaxed">
                    {post.excerpt || post.content_body.replace(/<[^>]*>?/gm, '').substring(0, 150)}...
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pt-0 pb-6 mt-auto">
                  <Button variant="ghost" className="p-0 h-auto text-primary hover:text-primary/80 group/btn font-black uppercase text-xs tracking-widest">
                    Read Full Article
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-32 text-center space-y-4">
              <ImageIcon className="h-16 w-16 mx-auto opacity-10" />
              <h3 className="text-2xl font-bold">No articles found</h3>
              <p className="text-muted-foreground">Try adjusting your search terms or check back later.</p>
              <Button variant="outline" onClick={() => setSearchTerm('')} className="mt-4">
                Clear Search
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
