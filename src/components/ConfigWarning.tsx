import { KeyRound, ExternalLink } from 'lucide-react';

export function ConfigWarning() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-zinc-900 border border-zinc-700 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center mx-auto mb-5">
          <KeyRound className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">TMDB API Key Required</h1>
        <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
          To use Muteeb Movie, you need a free TMDB API key. Get one in under a minute
          by creating a free account at themoviedb.org and requesting an API key.
        </p>
        <div className="bg-zinc-800 rounded-lg p-4 text-left mb-6">
          <p className="text-sm text-zinc-300 font-medium mb-2">Setup steps:</p>
          <ol className="text-sm text-zinc-400 space-y-1.5 list-decimal list-inside">
            <li>
              Create a free account at{' '}
              <a
                href="https://www.themoviedb.org/signup"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-400 hover:text-red-300 inline-flex items-center gap-0.5"
              >
                themoviedb.org
                <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>
              Go to Settings → API → Request API Key
            </li>
            <li>Choose "Developer" and fill in the form</li>
            <li>
              Copy your <strong className="text-zinc-200">API Key (v3 auth)</strong>
            </li>
            <li>
              Add it to your <code className="bg-zinc-900 px-1.5 py-0.5 rounded text-red-300">.env</code> file as{' '}
              <code className="bg-zinc-900 px-1.5 py-0.5 rounded text-red-300">VITE_TMDB_API_KEY=your_key_here</code>
            </li>
          </ol>
        </div>
        <p className="text-xs text-zinc-500">
          No signup, payment, or account is needed for the streaming itself —
          VidAPI embeds are free and keyless.
        </p>
      </div>
    </div>
  );
}
