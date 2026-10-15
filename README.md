# Muteeb Movie

A Netflix-style movie & TV streaming app built with React, TypeScript, Vite, and Tailwind CSS. Browse trending movies and TV shows, search with live suggestions, explore rich detail pages, and stream via embedded playback — all in a sleek, dark cinematic interface.

## Features

- **Home discovery**: rotating cinematic hero, trending, popular, top-rated, upcoming, plus Hidden Gems, Indian Cinema, and Anime rows
- **Genre browsing**: quick-browse chips and a full Browse page with genre, rating, year, language, and sort filters (TMDB `/discover`, server-side pagination)
- **Search**: debounced live suggestions with keyboard navigation, recent-search history, All/Movies/TV filter tabs, and paginated results
- **Detail pages**: cast & director, production details, official trailers (YouTube), legitimate "Where to Watch" providers, backdrop gallery, episode browser for TV
- **Playback**: embedded player with fullscreen, retry, and honest error states — availability varies by title and is never guaranteed
- **Personal library (no account needed, stored locally)**: watchlist, watch history, recent searches — with per-item removal and confirmed clear-all
- **Surprise Me**: jump to a random trending title
- Responsive mobile-first design, skeleton loading states, reduced-motion support

## Tech Stack

- **React 18** + **TypeScript**
- **Vite 5** for build tooling
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **TMDB API** for movie/TV metadata
- **VidAPI** for streaming embeds

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/muteebdeva/muteeb-movie.git
   cd muteeb-movie
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Get a free TMDB API key (v3 auth) from [themoviedb.org](https://www.themoviedb.org/settings/api)

4. Create a `.env` file in the project root (never commit it):
   ```bash
   cp .env.example .env
   # Edit .env and add your real key: VITE_TMDB_API_KEY=your_key_here
   ```

5. Start the dev server:
   ```bash
   npm run dev
   ```

6. Build for production:
   ```bash
   npm run build
   ```

### Checks

```bash
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm run build       # production build
```

## Deployment (Vercel)

The app uses hash-based routing (`#/movie/123`), so no rewrites are needed — a plain static deployment works, including page refreshes.

1. Import the repo in the Vercel dashboard.
2. Add the environment variable `VITE_TMDB_API_KEY` under **Settings → Environment Variables** (never commit keys to the repo).
3. Deploy. Rebuild after changing the variable, since Vite inlines it at build time.

## Notes on playback

Playback loads a third-party embed. A title being listed in TMDB search results does **not** mean it is currently playable — availability varies by title, region, and time. The player shows loading, retry, and error states, and never fabricates playback progress.

## License

For educational purposes only. This product uses the TMDB API but is not endorsed or certified by TMDB.
