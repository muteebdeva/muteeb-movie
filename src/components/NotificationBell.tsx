import { useState } from 'react';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { useNotifications } from '@/lib/notifications';

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}

export function NotificationBell() {
  const { notifications, unread, loading, markRead, markAllRead } = useNotifications(true);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-zinc-300 hover:text-white transition-colors"
        aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-[10px] font-bold text-white flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] z-20 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl shadow-black/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <p className="text-sm font-semibold text-white">Notifications</p>
              {unread > 0 && (
                <button
                  onClick={() => void markAllRead()}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {loading ? (
                <p className="px-4 py-8 text-sm text-zinc-500 text-center">Loading…</p>
              ) : notifications.length === 0 ? (
                <p className="px-4 py-8 text-sm text-zinc-500 text-center">
                  You're all caught up. Announcements from the team will appear here.
                </p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-zinc-800/60 last:border-0 ${
                      n.read ? 'opacity-70' : 'bg-zinc-800/40'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {!n.read && <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white leading-snug">{n.title}</p>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed whitespace-pre-line">
                          {n.message}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[11px] text-zinc-600">{timeAgo(n.publish_at)}</span>
                          {n.link && (
                            <a
                              href={n.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => void markRead(n.id)}
                              className="inline-flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300"
                            >
                              <ExternalLink className="w-3 h-3" /> Open link
                            </a>
                          )}
                          {!n.read && (
                            <button
                              onClick={() => void markRead(n.id)}
                              className="text-[11px] text-zinc-500 hover:text-white transition-colors"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
