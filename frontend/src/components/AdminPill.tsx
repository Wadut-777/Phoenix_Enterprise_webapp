import { useSyncExternalStore } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';

// DynamicPage registers the CMS page it shows; the pill uses it to offer "Edit Website".
let target: string | null = null;
const listeners = new Set<() => void>();
export function setEditTarget(slug: string | null) {
  target = slug;
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export function AdminPill() {
  const { user, can } = useAuth();
  const current = useSyncExternalStore(subscribe, () => target);
  const { pathname } = useLocation();
  const [sp] = useSearchParams();
  if (!user || sp.get('embed') === '1' || sp.get('edit') === '1') return null;
  return (
    <div className="fixed bottom-5 left-5 z-40 flex text-xs font-semibold shadow-card">
      {current && can('content') && <Link to={`${pathname}?edit=1`} className="bg-ember px-4 py-3 text-white hover:bg-ember-dark">Edit Website</Link>}
      <Link to="/admin" className="bg-ink px-4 py-3 text-paper hover:bg-graphite">Admin</Link>
    </div>
  );
}
