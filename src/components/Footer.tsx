import { Github, ExternalLink } from 'lucide-react';
import { Logo } from '@/components/Logo';

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 mt-16">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo className="w-6 h-6 rounded object-contain" />
            <span className="text-lg font-bold text-white">
              Muteeb<span className="text-red-500"> Movie</span>
            </span>
          </div>

          <p className="text-xs text-zinc-500 text-center max-w-2xl">
            This product uses the TMDB API but is not endorsed or certified by TMDB.
            Movie data provided by{' '}
            <a
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-white inline-flex items-center gap-0.5"
            >
              TMDB
              <ExternalLink className="w-3 h-3" />
            </a>
            . Streaming via{' '}
            <a
              href="https://vidapi.ru"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-white inline-flex items-center gap-0.5"
            >
              VidAPI
              <ExternalLink className="w-3 h-3" />
            </a>
            .
          </p>

          <div className="flex items-center gap-3 text-zinc-500">
            <a
              href="https://github.com/muteebdeva/muteeb-movie"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
              aria-label="Muteeb Movie on GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
        <p className="text-center text-xs text-zinc-600 mt-4">
          For educational purposes only. Muteeb Movie 2026.
        </p>
      </div>
    </footer>
  );
}
