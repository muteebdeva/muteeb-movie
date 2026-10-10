import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  message?: string;
}

export function Spinner({ message = 'Loading...' }: SpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
      <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
      <p className="text-sm text-zinc-400">{message}</p>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 text-center px-4">
      <p className="text-zinc-300 text-lg">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
