# Muteeb Movie

A Netflix-style movie & TV streaming app built with React, TypeScript, Vite, and Tailwind CSS. Browse trending movies and TV shows, search for titles, view details, and stream content — all in a sleek, dark-themed interface.

## Features

- Trending, popular, top-rated, and upcoming movies & TV shows
- Search across movies and TV shows
- Detailed pages with cast, crew, genres, and recommendations
- TV show season/episode browser
- Built-in video player with fullscreen support
- Personal watchlist (saved locally)
- Fully responsive design

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** for build tooling
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

3. Get a free TMDB API key from [themoviedb.org](https://www.themoviedb.org/settings/api)

4. Create a `.env` file in the project root:
   ```bash
   cp .env.example .env
   # Edit .env and add your API key
   ```

5. Start the dev server:
   ```bash
   npm run dev
   ```

6. Build for production:
   ```bash
   npm run build
   ```

## License

For educational purposes only.
