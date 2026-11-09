import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ToastProvider } from './ui';
import { MediaPage, MediaPickerProvider } from './MediaLibrary';
import { ResourceManager } from './ResourceManager';
import { resources } from './resources';
import Login from './Login';
import { ActivityPage, Applications, BackupsPage, Dashboard, Enquiries, SeoPage, SettingsPage } from './pages';

const nav: { to: string; label: string; perm: string; group: string }[] = [
  { to: '/admin', label: 'Overview', perm: '', group: 'Website' },
  { to: '/admin/pages', label: 'Pages', perm: 'content', group: 'Website' },
  { to: '/admin/menus', label: 'Navigation menus', perm: 'settings', group: 'Website' },
  { to: '/admin/settings', label: 'Header, footer & settings', perm: 'settings', group: 'Website' },
  { to: '/admin/seo', label: 'SEO', perm: 'content', group: 'Website' },
  { to: '/admin/services', label: 'Services', perm: 'content', group: 'Content' },
  { to: '/admin/projects', label: 'Projects', perm: 'projects', group: 'Content' },
  { to: '/admin/project-categories', label: 'Project categories', perm: 'projects', group: 'Content' },
  { to: '/admin/industries', label: 'Industries', perm: 'content', group: 'Content' },
  { to: '/admin/blog', label: 'News & insights', perm: 'content', group: 'Content' },
  { to: '/admin/testimonials', label: 'Testimonials', perm: 'content', group: 'Content' },
  { to: '/admin/clients', label: 'Client logos', perm: 'content', group: 'Content' },
  { to: '/admin/faqs', label: 'FAQs', perm: 'content', group: 'Content' },
  { to: '/admin/media', label: 'Media library', perm: 'media', group: 'Content' },
  { to: '/admin/enquiries', label: 'Enquiries', perm: 'enquiries', group: 'Inbox' },
  { to: '/admin/jobs', label: 'Job openings', perm: 'careers', group: 'Inbox' },
  { to: '/admin/applications', label: 'Applications', perm: 'careers', group: 'Inbox' },
  { to: '/admin/users', label: 'Users & roles', perm: 'users', group: 'System' },
  { to: '/admin/activity', label: 'Activity log', perm: 'logs', group: 'System' },
  { to: '/admin/backups', label: 'Backups', perm: 'logs', group: 'System' },
];

function Shell() {
  const { user, loading, can, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    document.title = 'Admin | Phoenix Enterprise';
    const m = document.createElement('meta');
    m.name = 'robots';
    m.content = 'noindex,nofollow';
    document.head.appendChild(m);
    return () => m.remove();
  }, []);
  if (loading) return <p className="p-10 text-concrete">Loading…</p>;
  if (!user) return <Navigate to={`/admin/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  const groups = [...new Set(nav.map((n) => n.group))];
  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[260px_1fr]">
      <header className="flex items-center justify-between bg-ink px-5 py-3 text-paper lg:hidden">
        <span className="font-display font-bold">Phoenix admin</span>
        <button aria-expanded={open} aria-label="Menu" onClick={() => setOpen(!open)} className="px-2 text-2xl">{open ? '×' : '☰'}</button>
      </header>
      <aside className={`${open ? 'block' : 'hidden'} bg-ink text-paper lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto`}>
        <div className="hidden p-6 lg:block"><p className="eyebrow !mb-1">Phoenix Enterprise</p><p className="font-display text-xl font-extrabold">Admin</p></div>
        <nav aria-label="Admin" className="px-3 pb-6">
          {groups.map((g) => {
            const items = nav.filter((n) => n.group === g && (!n.perm || can(n.perm)));
            return items.length ? (
              <div key={g} className="mb-5">
                <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-paper/40">{g}</p>
                {items.map((n) => (
                  <NavLink key={n.to} to={n.to} end={n.to === '/admin'} className={({ isActive }) => `block px-3 py-2 text-sm ${isActive ? 'bg-ember text-white' : 'text-paper/75 hover:bg-graphite'}`}>{n.label}</NavLink>
                ))}
              </div>
            ) : null;
          })}
        </nav>
        <div className="border-t border-white/10 p-5 text-xs">
          <p className="font-semibold">{user.name}</p>
          <p className="text-paper/50">{user.role.replace('_', ' ')}</p>
          <div className="mt-3 flex gap-4"><Link to="/" className="hover:text-ember">View site</Link><button onClick={logout} className="hover:text-ember">Sign out</button></div>
        </div>
      </aside>
      <main className="min-w-0 p-5 sm:p-8"><Outlet /></main>
    </div>
  );
}

function Guard({ perm, children }: { perm: string; children: JSX.Element }) {
  const { can } = useAuth();
  return can(perm) ? children : <p className="text-sm text-concrete">Your role doesn't have access to this section.</p>;
}

const res = (key: string, path = key) => <Route path={path} element={<Guard perm={resources[key].perm}><ResourceManager cfg={resources[key]} /></Guard>} />;

export default function AdminApp() {
  return (
    <ToastProvider>
      <MediaPickerProvider>
        <Routes>
          <Route path="login" element={<Login />} />
          <Route element={<Shell />}>
            <Route index element={<Dashboard />} />
            {res('pages')}{res('services')}{res('projects')}{res('project-categories')}{res('industries')}
            {res('blogs', 'blog')}{res('testimonials')}{res('clients')}{res('faqs')}{res('jobs')}{res('menus')}{res('users')}
            <Route path="media" element={<Guard perm="media"><MediaPage /></Guard>} />
            <Route path="enquiries" element={<Guard perm="enquiries"><Enquiries /></Guard>} />
            <Route path="applications" element={<Guard perm="careers"><Applications /></Guard>} />
            <Route path="settings" element={<Guard perm="settings"><SettingsPage /></Guard>} />
            <Route path="seo" element={<Guard perm="content"><SeoPage /></Guard>} />
            <Route path="activity" element={<Guard perm="logs"><ActivityPage /></Guard>} />
            <Route path="backups" element={<Guard perm="logs"><BackupsPage /></Guard>} />
            <Route path="*" element={<p className="text-concrete">Page not found.</p>} />
          </Route>
        </Routes>
      </MediaPickerProvider>
    </ToastProvider>
  );
}
