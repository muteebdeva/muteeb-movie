import { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, AlertCircle, Maximize, RotateCcw, ExternalLink } from 'lucide-react';
import { parsePlayerEvent, type PlayerEventData, type PlayerQuality } from '@/lib/playerEvents';
import { IFRAME_SANDBOX } from '@/lib/playerSecurity';

interface VideoPlayerProps {
  src: string;
  title: string;
  /** Called with validated PLAYER_EVENT data from the provider's iframe. */
  onPlayerEvent?: (data: PlayerEventData) => void;
}

const SPINNER_TIMEOUT_MS = 8000;

export function VideoPlayer({ src, title, onPlayerEvent }: VideoPlayerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [quality, setQuality] = useState<PlayerQuality | null>(null);
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);
  const onPlayerEventRef = useRef(onPlayerEvent);
  onPlayerEventRef.current = onPlayerEvent;

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
    setQuality(null);
    setAvailableQualities([]);
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

  // Listen for the provider's PLAYER_EVENT messages. Origin and shape are
  // validated inside parsePlayerEvent — anything else is ignored.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = parsePlayerEvent(event);
      if (!data) return;
      if (data.quality) setQuality(data.quality);
      if (data.availableQualities.length > 0) setAvailableQualities(data.availableQualities);
      onPlayerEventRef.current?.(data);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

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

  // Iframe load failures are not detectable cross-origin, so the error
  // panel is also reachable through the "report a problem" action below.
  const reportProblem = useCallback(() => setError(true), []);

  if (error) {
    return (
      <div className="relative w-full aspect-video bg-zinc-900 rounded-xl flex flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Playback Unavailable</h3>
          <p className="text-sm text-zinc-400 max-w-md">
            We couldn't load the video stream for this title. The third-party
            source may be temporarily down, blocked in your region, or this
            title may not be in the streaming library. Try again later or pick
            a different title.
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
    <div>
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
        // Sandboxed: blocks ad popups and full-page redirects from inside the
        // third-party player without affecting playback (see playerSecurity.ts).
        sandbox={IFRAME_SANDBOX}
        onLoad={handleLoad}
      />

      {/* Genuine quality badge: shows ONLY the rendition the provider itself
          reports via PLAYER_EVENT — never guessed, never hardcoded. */}
      {quality && (
        <div
          className="absolute top-3 left-3 z-20 px-2 py-1 rounded bg-black/60 backdrop-blur-sm text-[11px] font-semibold text-white pointer-events-none"
          title={
            availableQualities.length > 0
              ? `Source offers: ${availableQualities.join(' · ')}`
              : 'Current stream quality'
          }
        >
          {quality.label}
        </div>
      )}

      <button
        onClick={enterFullscreen}
        className="absolute top-3 right-3 z-20 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
        title="Fullscreen"
      >
        <Maximize className="w-5 h-5" />
      </button>
    </div>
    <div className="flex justify-between items-center mt-2">
      <p className="text-xs text-zinc-500">
        {availableQualities.length > 0
          ? `Available qualities: ${availableQualities.join(' · ')}`
          : 'Quality is set automatically by the stream source.'}
      </p>
      <button
        onClick={reportProblem}
        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        Stream not loading? Report a problem
      </button>
    </div>
    </div>
  );
}
