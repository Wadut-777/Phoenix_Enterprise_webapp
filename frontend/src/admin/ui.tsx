import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type Toast = { id: number; kind: 'ok' | 'err'; text: string };
const ToastCtx = createContext<(text: string, kind?: 'ok' | 'err') => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, kind: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((l) => [...l, { id, kind, text }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), kind === 'err' ? 7000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-5 right-5 z-[200] space-y-2" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`max-w-sm px-4 py-3 text-sm text-white shadow-card ${t.kind === 'err' ? 'bg-red-700' : 'bg-ink'}`}>{t.text}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function Drawer({ title, onClose, children, footer, wide = false }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-ink/50" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside role="dialog" aria-modal="true" aria-label={title} className={`flex h-full w-full flex-col bg-white shadow-card ${wide ? 'max-w-3xl' : 'max-w-xl'}`}>
        <header className="flex items-center justify-between border-b border-stone px-6 py-4">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="px-2 text-2xl leading-none text-concrete hover:text-ink">×</button>
        </header>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && <footer className="flex items-center justify-end gap-3 border-t border-stone px-6 py-4">{footer}</footer>}
      </aside>
    </div>
  );
}

export function Modal({ title, onClose, children, size = 'max-w-5xl' }: { title: string; onClose: () => void; children: ReactNode; size?: string }) {
  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-ink/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`flex max-h-[90vh] w-full flex-col bg-white shadow-card ${size}`}>
        <header className="flex items-center justify-between border-b border-stone px-6 py-4">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="px-2 text-2xl leading-none text-concrete hover:text-ink">×</button>
        </header>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

export function Badge({ children, tone = 'grey' }: { children: ReactNode; tone?: 'grey' | 'green' | 'amber' | 'red' | 'blue' }) {
  const c = { grey: 'bg-stone text-graphite', green: 'bg-green-100 text-green-800', amber: 'bg-amber-100 text-amber-800', red: 'bg-red-100 text-red-800', blue: 'bg-blue-100 text-blue-800' }[tone];
  return <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${c}`}>{children}</span>;
}

export const stateTone = (s?: string) => (s === 'published' || s === 'Completed' ? 'green' : s === 'scheduled' ? 'blue' : s === 'Ongoing' ? 'amber' : 'grey') as 'green' | 'blue' | 'amber' | 'grey';

export function Pager({ page, total, limit, onPage }: { page: number; total: number; limit: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  return (
    <div className="mt-6 flex items-center justify-between text-sm">
      <span className="text-concrete">{total} total</span>
      <div className="flex gap-2">
        <button className="btn-dark !px-4 !py-2 disabled:opacity-40" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <span className="px-2 py-2">Page {page} of {pages}</span>
        <button className="btn-dark !px-4 !py-2 disabled:opacity-40" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}

export const fmtDate = (d?: string) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '');

export function PageTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <h1 className="font-display text-3xl font-extrabold">{title}</h1>
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}
