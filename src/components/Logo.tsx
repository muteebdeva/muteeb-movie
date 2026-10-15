interface LogoProps {
  className?: string;
}

/**
 * Muteeb Movie brand mark — inline SVG so it can never 404 like the
 * old /logo.png reference did (that file was never committed).
 */
export function Logo({ className = 'w-8 h-8' }: LogoProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect x="1.5" y="1.5" width="45" height="45" rx="13" fill="#dc2626" />
      <path d="M19 15.5v17l15-8.5z" fill="#ffffff" />
    </svg>
  );
}
