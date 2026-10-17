import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface FieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

export function Field({ label, error, children }: FieldProps) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-zinc-300 mb-1.5">{label}</span>
      {children}
      {error && <span className="block mt-1.5 text-sm text-red-400">{error}</span>}
    </label>
  );
}

export const inputClass =
  'w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition';

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  autoComplete: string;
  placeholder?: string;
}

export function PasswordField({ label, value, onChange, error, autoComplete, placeholder }: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} error={error}>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={`${inputClass} pr-11`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
        >
          {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
    </Field>
  );
}

export function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2.5 transition flex items-center justify-center gap-2"
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden />
      )}
      {children}
    </button>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="bg-red-600/15 border border-red-600/30 text-red-200 text-sm rounded-lg px-3.5 py-2.5">
      {message}
    </div>
  );
}

export function FormSuccess({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="status" className="bg-green-600/15 border border-green-600/30 text-green-200 text-sm rounded-lg px-3.5 py-2.5">
      {message}
    </div>
  );
}
