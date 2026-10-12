import { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, AlertCircle, Maximize, RotateCcw, ExternalLink } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  title: string;
}

const SPINNER_TIMEOUT_MS = 8000;

export function VideoPlayer({ src, title }: VideoPlayerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);

  const handleLoad = useCallback(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setLoading(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    loadedRef.current = false;
    setLoading(true);
    setError(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (!loadedRef.current) {
        setLoading(false);
      }
    }, SPINNER_TIMEOUT_MS);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [src, retryKey]);

  const handleRetry = useCallback(() => {
    setRetryKey((k) => k + 1);
  }, []);

  const enterFullscreen = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const container = iframe.parentElement;
    if (container?.requestFullscreen) {
      container.requestFullscreen().catch(() => {});
    } else if (iframe.requestFullscreen) {
      iframe.requestFullscreen().catch(() => {});
    }
  }, []);

  if (error) {
    return (
      <div className="relative w-full aspect-video bg-zinc-900 rounded-xl flex flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Playback Unavailable</h3>
          <p className="text-sm text-zinc-400 max-w-md">
            We couldn't load the video stream for this title. The source may be
            temporarily unavailable or this content may not be in the streaming
            library. Try again later or pick a different title.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Retry
          </button>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open Player
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden group">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-10 pointer-events-none">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
            <p className="text-sm text-zinc-400">Loading player...</p>
          </div>
        </div>
      )}

      <iframe
        key={`${src}-${retryKey}`}
        ref={iframeRef}
        src={src}
        title={title}
        className="absolute inset-0 w-full h-full"
        frameBorder="0"
        allowFullScreen
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture; accelerometer; gyroscope"
        onLoad={handleLoad}
      />

      <button
        onClick={enterFullscreen}
        className="absolute top-3 right-3 z-20 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
        title="Fullscreen"
      >
        <Maximize className="w-5 h-5" />
      </button>
    </div>
  );
}
