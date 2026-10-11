import { useEffect, useState } from 'react';
import { Search, Bookmark, Menu, X } from 'lucide-react';
import { navigate } from '@/lib/router';

interface NavbarProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
}

export function Navbar({ onSearch, initialQuery = '' }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      onSearch(q);
      setSearchOpen(false);
      setMobileMenuOpen(false);
    }
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
              onClick={() => navigate('/watchlist')}
              className="flex items-center gap-1.5 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
            >
              <Bookmark className="w-4 h-4" />
              My List
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <form onSubmit={handleSubmit} className="relative hidden sm:block">
            <div
              className={`flex items-center transition-all duration-300 ${
                searchOpen
                  ? 'w-64 lg:w-72 bg-zinc-900/90 border border-zinc-700'
                  : 'w-9 bg-transparent border border-transparent'
              } rounded-full overflow-hidden`}
            >
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                className="p-2 text-zinc-300 hover:text-white shrink-0"
              >
                <Search className="w-5 h-5" />
              </button>
              {searchOpen && (
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search movies, TV shows..."
                  className="bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none flex-1 pr-3"
                  autoFocus
                />
              )}
            </div>
          </form>

          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden p-2 text-zinc-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="md:hidden bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 px-4 py-4 space-y-3">
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-full overflow-hidden">
              <Search className="w-5 h-5 text-zinc-400 ml-3 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search movies, TV shows..."
                className="bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none flex-1 px-3 py-2.5"
              />
            </div>
          </form>
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
