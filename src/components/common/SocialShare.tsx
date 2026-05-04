import { Facebook, Send, Link2, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SocialShareProps {
  url?: string;
  title?: string;
  className?: string;
}

export function SocialShare({ 
  url = window.location.href, 
  title = document.title,
  className = "" 
}: SocialShareProps) {
  const shareLinks = [
    {
      name: 'Telegram',
      icon: <Send className="w-4 h-4 mr-2" />,
      url: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    },
    {
      name: 'X',
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 mr-2 fill-current">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
        </svg>
      ),
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    },
    {
      name: 'Facebook',
      icon: <Facebook className="w-4 h-4 mr-2" />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
  ];

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  return (
    <div className={`fixed right-6 bottom-24 z-50 flex flex-col gap-3 ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            size="icon" 
            className="w-12 h-12 rounded-full shadow-2xl bg-primary text-primary-foreground hover:scale-110 transition-transform duration-300 hover:drop-shadow-[0_0_15px_rgba(212,175,55,0.6)]"
          >
            <Share2 className="w-6 h-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-card border-border">
          {shareLinks.map((link) => (
            <DropdownMenuItem key={link.name} asChild>
              <a 
                href={link.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center w-full cursor-pointer"
              >
                {link.icon}
                {link.name}
              </a>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={copyToClipboard} className="cursor-pointer">
            <Link2 className="w-4 h-4 mr-2" />
            Copy Link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
