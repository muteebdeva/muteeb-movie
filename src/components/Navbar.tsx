import { useEffect, useState } from 'react';
import { Search, Bookmark, Menu, X, Compass, User, LogOut } from 'lucide-react';
import { navigate } from '@/lib/router';
import { SearchBox } from '@/components/SearchBox';
import { Logo } from '@/components/Logo';
import { useSearchHistory } from '@/lib/useHistory';
import { useAuth } from '@/lib/auth';

interface NavbarProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
}

export function Navbar({ onSearch, initialQuery = '' }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { recordSearch } = useSearchHistory();
  const { user, loading: authLoading, signout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSubmit = (query: string) => {
    recordSearch(query);
    onSearch(query);
    setSearchOpen(false);
    setMobileMenuOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-zinc-950/95 backdrop-blur-md shadow-lg shadow-black/40'
          : 'bg-gradient-to-b from-black/70 to-transparent'
      }`}
    >
      <nav className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 lg:gap-10">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 group"
            aria-label="Muteeb Movie home"
          >
            <Logo className="w-8 h-8 rounded object-contain transition-transform group-hover:scale-105" />
            <span className="text-xl font-bold tracking-tight text-white">
              Muteeb<span className="text-red-500"> Movie</span>
            </span>
          </button>

          <div className="hidden md:flex items-center gap-6">
            <button
              onClick={() => navigate('/')}
              className="text-sm font-medium text-zinc-300 hover:text-white transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => navigate('/browse')}
              className="flex items-center gap-1.5 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
            >
              <Compass className="w-4 h-4" />
              Browse
            </button>
            <button
              onClick={() => navigate('/watchlist')}
              className="flex items-center gap-1.5 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
            >
              <Bookmark className="w-4 h-4" />
              My List
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`hidden sm:block transition-all duration-300 ${
              searchOpen
                ? 'w-64 lg:w-80 bg-zinc-900/90 border border-zinc-700'
                : 'w-9 bg-transparent border border-transparent'
            } rounded-full`}
          >
            {searchOpen ? (
              <SearchBox
                initialQuery={initialQuery}
                onSubmit={handleSubmit}
                autoFocus
                onNavigate={() => setSearchOpen(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="p-2 text-zinc-300 hover:text-white"
                aria-label="Open search"
              >
                <Search className="w-5 h-5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden p-2 text-zinc-300 hover:text-white"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {!authLoading &&
            (user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-full pl-1 pr-3 py-1 transition-colors"
                  aria-label="Account menu"
                >
                  <span className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold">
                    {user.displayName.charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden sm:block max-w-[100px] truncate">{user.displayName}</span>
                </button>
                {userMenuOpen && (
                  <>
                    <button
                      aria-hidden
                      tabIndex={-1}
                      className="fixed inset-0 z-10 cursor-default"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 z-20 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl shadow-black/50 py-2">
                      <div className="px-4 py-2 border-b border-zinc-800">
                        <p className="text-sm font-medium text-white truncate">{user.displayName}</p>
                        <p className="text-xs text-zinc-400 truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          void signout();
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => navigate('/signin')}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-full px-4 py-2 transition-colors"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Sign in</span>
              </button>
            ))}
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="md:hidden bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 px-4 py-4 space-y-3">
          <div className="bg-zinc-900 border border-zinc-700 rounded-full">
            <SearchBox
              initialQuery={initialQuery}
              onSubmit={handleSubmit}
              onNavigate={() => setMobileMenuOpen(false)}
            />
          </div>
          <button
            onClick={() => {
              navigate('/');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left text-sm font-medium text-zinc-300 hover:text-white py-2"
          >
            Home
          </button>
          <button
            onClick={() => {
              navigate('/browse');
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-2 w-full text-left text-sm font-medium text-zinc-300 hover:text-white py-2"
          >
            <Compass className="w-4 h-4" />
            Browse
          </button>
          <button
            onClick={() => {
              navigate('/watchlist');
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-2 w-full text-left text-sm font-medium text-zinc-300 hover:text-white py-2"
          >
            <Bookmark className="w-4 h-4" />
            My List
          </button>
          {!authLoading &&
            (user ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  void signout();
                }}
                className="flex items-center gap-2 w-full text-left text-sm font-medium text-zinc-300 hover:text-white py-2"
              >
                <LogOut className="w-4 h-4" />
                Sign out ({user.displayName})
              </button>
            ) : (
              <button
                onClick={() => {
                  navigate('/signin');
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 w-full text-left text-sm font-medium text-zinc-300 hover:text-white py-2"
              >
                <User className="w-4 h-4" />
                Sign in
              </button>
            ))}
        </div>
      )}
    </header>
  );
}
