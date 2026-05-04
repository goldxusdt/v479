import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/contexts/SettingsContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Menu, LogOut, User, Shield, ChevronDown } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';
import { Logo } from '@/components/common/Logo';
import { cn } from '@/utils/utils';
import { useState, useEffect } from 'react';

import { RightSlider } from './RightSlider';

export function Header() {
  const { user, profile, signOut } = useAuth();
  const { settings } = useSettings();
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  const getInitials = (): string => {
    if (profile?.full_name) {
      return profile.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return 'U';
  };

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full transition-all duration-500 border-b",
      scrolled 
        ? "bg-background/80 backdrop-blur-2xl border-primary/20 h-16 shadow-[0_4px_30px_rgba(0,0,0,0.3)]" 
        : "bg-transparent border-transparent h-20"
    )}>
      <div className="container flex h-full items-center justify-between px-4 sm:px-6 mx-auto max-w-7xl">
        <div className="flex items-center gap-6">
          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon" className="hover:bg-primary/10 hover:text-primary transition-colors touch-target">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 border-r-primary/20 bg-sidebar/95 backdrop-blur-xl w-[280px] duration-0 animate-none">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <SheetDescription className="sr-only">Access platform features and account settings</SheetDescription>
              <Sidebar />
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex items-center gap-3 group transition-transform hover:scale-105 active:scale-95">
            <div className="p-1.5 rounded-xl bg-primary/10 border border-primary/20 ">
              <Logo size={32} />
            </div>
            <span className="font-black text-xl tracking-tighter v56-gradient-text hidden sm:inline-block uppercase">
              {settings?.site_title || 'GOLD X USDT'}
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {user && profile?.role === 'admin' && (
            <Link to="/admin" className="hidden xl:flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all">
              <Shield className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-widest">Admin Portal</span>
            </Link>
          )}
          {user ? (
            <div className="flex items-center gap-3">
              <RightSlider />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative flex items-center gap-3 pl-2 pr-4 h-12 rounded-2xl border border-white/5 hover:bg-white/5 hover:border-primary/20 transition-all">
                    <Avatar className="h-8 w-8 rounded-xl border border-primary/20 ">
                      <AvatarFallback className="bg-primary/20 text-primary font-bold">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start hidden md:flex">
                      <p className="text-xs font-black uppercase tracking-widest leading-none">{t('nav.profile')}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[100px]">{profile?.full_name?.split(' ')[0] || 'User'}</p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 mt-2 p-2 rounded-2xl v56-glass border-primary/20 shadow-2xl" align="end">
                  <DropdownMenuLabel className="px-3 py-4">
                    <div className="flex flex-col space-y-2">
                      <p className="text-sm font-black uppercase tracking-widest text-primary">
                        {profile?.full_name || 'Member Account'}
                      </p>
                      <p className="text-xs font-mono text-muted-foreground truncate">
                        {profile?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-primary/10" />
                  <div className="p-1 space-y-1">
                    <DropdownMenuItem asChild className="rounded-xl py-3 cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors focus:bg-primary/10 focus:text-primary">
                      <Link to="/profile">
                        <User className="mr-3 h-4 w-4" />
                        <span className="font-bold">My Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    {profile?.role === 'admin' && (
                      <DropdownMenuItem asChild className="rounded-xl py-3 cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors focus:bg-primary/10 focus:text-primary">
                        <Link to="/admin">
                          <Shield className="mr-3 h-4 w-4" />
                          <span className="font-bold">{"Elite Dashboard"}</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </div>
                  <DropdownMenuSeparator className="bg-primary/10" />
                  <div className="p-1">
                    <DropdownMenuItem onClick={handleSignOut} className="rounded-xl py-3 cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors focus:bg-destructive/10 focus:text-destructive">
                      <LogOut className="mr-3 h-4 w-4" />
                      <span className="font-bold">Secure Sign Out</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button variant="ghost" className="font-bold rounded-xl hidden sm:flex hover:bg-primary/10" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
              <Button className=" font-bold rounded-xl px-6 h-11" asChild>
                <Link to="/signup">Join Now</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
