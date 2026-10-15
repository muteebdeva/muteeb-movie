import { useEffect, useState } from 'react';
import { Search, Bookmark, Menu, X, Compass } from 'lucide-react';
import { navigate } from '@/lib/router';
import { SearchBox } from '@/components/SearchBox';
import { useSearchHistory } from '@/lib/useHistory';

interface NavbarProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
}

export function Navbar({ onSearch, initialQuery = '' }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { recordSearch } = useSearchHistory();

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
            <img src="/logo.png" alt="Muteeb Movie" className="w-8 h-8 rounded object-contain transition-transform group-hover:scale-105" />
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
        </div>
      )}
    </header>
  );
}
