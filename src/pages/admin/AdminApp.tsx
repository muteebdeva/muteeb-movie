import { useCallback, useEffect, useState } from 'react';
import { adminApi, type AdminUser } from '@/lib/adminApi';
import { AdminLogin } from './AdminLogin';
import { AdminLayout, type AdminPageKey } from './components/AdminLayout';
import { Toaster, ConfirmHost, LoadingBlock } from './components/ui';
import { Dashboard } from './pages/Dashboard';
import { Titles } from './pages/Titles';
import { Collections } from './pages/Collections';
import { Sections } from './pages/Sections';
import { Providers } from './pages/Providers';
import { Analytics } from './pages/Analytics';
import { Audit } from './pages/Audit';
import { Settings } from './pages/Settings';

export function AdminApp() {
  const [admin, setAdmin] = useState<AdminUser | false | null>(null);
  const [page, setPage] = useState<AdminPageKey>('dashboard');

  useEffect(() => {
    adminApi
      .me()
      .then((u) => setAdmin(u))
      .catch(() => setAdmin(false));
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminApi.logout();
    } catch {
      /* already logged out */
    }
    setAdmin(false);
  }, []);

  return (
    <>
      <Toaster />
      <ConfirmHost />
      {admin === null ? (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <LoadingBlock message="Checking session…" />
        </div>
      ) : admin === false ? (
        <AdminLogin onLogin={setAdmin} />
      ) : (
        <AdminLayout admin={admin} page={page} onNavigate={setPage} onLogout={logout}>
          {page === 'dashboard' && <Dashboard />}
          {page === 'titles' && <Titles />}
          {page === 'collections' && <Collections />}
          {page === 'sections' && <Sections />}
          {page === 'providers' && <Providers />}
          {page === 'analytics' && <Analytics />}
          {page === 'audit' && <Audit />}
          {page === 'settings' && <Settings />}
        </AdminLayout>
      )}
    </>
  );
}
