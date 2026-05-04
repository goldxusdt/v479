import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getBlogPostBySlug, getBlogPosts } from '@/services/api';
import { BlogPost } from '@/types';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Clock, 
  Share2,
  ChevronRight,
  Loader2,
  Image as ImageIcon,
  Tag
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SEOHead, generateArticleSchema } from '@/utils/seo';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import { toast } from 'sonner';

export default function BlogPostPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  const articleSchema = post ? generateArticleSchema({
    title: post.title,
    description: post.excerpt || post.title,
    image: post.featured_image_url || `${window.location.origin}/logo.svg`,
    author: post.author,
    publishedDate: post.publication_date,
  }) : undefined;

  useEffect(() => {
    const loadData = async () => {
      if (!slug) return;
      
      try {
        setLoading(true);
        const data = await getBlogPostBySlug(slug);
        
        if (data && data.status === 'published') {
          setPost(data);
          
          // Load related posts
          const allPosts = await getBlogPosts({ limit: 4 });
          setRelatedPosts(allPosts.filter((p: BlogPost) => p.slug !== slug).slice(0, 3));
        } else {
          toast.error('Article not found');
          navigate('/blog');
        }
      } catch (error) {
        console.error('Failed to fetch post:', error);
        navigate('/blog');
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

  if (!post) return null;

  return (
    <div className="min-h-screen pt-24 pb-20">
      <SEOHead 
        title={`${post.seo_meta_title || post.title} | Gold X Usdt Blog`}
        description={post.seo_meta_description || post.excerpt || post.title}
        image={post.featured_image_url || undefined}
        type="article"
        publishedTime={post.publication_date}
        schemas={articleSchema ? [articleSchema] : []}
      />

      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground mb-8">
          <Link to="/blog" className="hover:text-primary transition-colors">Blog</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-primary truncate">{post.title}</span>
        </div>

        <article className="space-y-8">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {(post as any).blog_post_categories?.map((cat: any) => (
                <Badge key={cat.blog_categories.id} className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase font-bold tracking-widest px-3">
                  {cat.blog_categories.name}
                </Badge>
              ))}
            </div>
            
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tighter">
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 py-6 border-y border-white/5">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                  {post.author[0]}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest">{post.author}</p>
                  <p className="text-[10px] text-muted-foreground">Article Author</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-bold uppercase tracking-widest ml-auto">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-primary" />
                  {format(new Date(post.publication_date), 'MMM dd, yyyy')}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-primary" />
                  {Math.ceil(post.content_body.length / 1000)} min read
                </span>
              </div>
            </div>
          </div>

          <div className="aspect-video w-full rounded-2xl overflow-hidden bg-white/5 border border-white/10">
            {post.featured_image_url ? (
              <img 
                src={post.featured_image_url} 
                alt={post.title} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="h-20 w-20 text-white/5" />
              </div>
            )}
          </div>

          <div 
            className="prose prose-invert prose-gold max-w-none text-muted-foreground leading-relaxed text-lg ql-editor !p-0"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content_body) }}
          />

          <div className="pt-10 space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mr-2">
                <Tag className="h-3 w-3" />
                Tags:
              </span>
              {(post as any).blog_post_tags?.map((tag: any) => (
                <Link 
                  key={tag.blog_tags.id} 
                  to={`/blog?tag=${tag.blog_tags.slug}`}
                  className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] uppercase font-bold tracking-widest transition-colors"
                >
                  {tag.blog_tags.name}
                </Link>
              ))}
            </div>
            
            <div className="flex justify-between items-center py-8 border-t border-white/5">
              <Button 
                variant="outline" 
                className="v56-glass border-white/10"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('Article link copied!');
                }}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share Article
              </Button>
              
              <Link to="/blog">
                <Button variant="ghost" className="text-primary hover:text-primary/80 font-bold uppercase text-xs tracking-widest">
                  Back to Blog
                </Button>
              </Link>
            </div>
          </div>
        </article>

        {relatedPosts.length > 0 && (
          <div className="mt-24 space-y-8">
            <h2 className="text-2xl font-black uppercase tracking-widest text-primary">Related Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((related) => (
                <Link key={related.id} to={`/blog/${related.slug}`} className="group space-y-4">
                  <div className="aspect-video rounded-xl overflow-hidden bg-white/5 border border-white/5">
                    {related.featured_image_url ? (
                      <img src={related.featured_image_url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-8 w-8 text-white/10" /></div>
                    )}
                  </div>
                  <h3 className="font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                    {related.title}
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
