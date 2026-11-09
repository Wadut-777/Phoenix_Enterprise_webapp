import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, del, post, put } from '../lib/adminApi';
import { emptyFrom } from '../lib/blockDefs';
import { FormEngine } from './FormEngine';
import { Drawer, Pager, PageTitle, fmtDate, useToast } from './ui';
import type { Cfg } from './resources';

type Editing = { id?: string; value: any } | null;

export function ResourceManager({ cfg }: { cfg: Cfg }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Editing>(null);
  const [tab, setTab] = useState<'edit' | 'history'>('edit');
  const [error, setError] = useState('');

  useEffect(() => { setPage(1); setQ(''); setFilter(''); setEditing(null); }, [cfg.endpoint]);

  const params = new URLSearchParams({ page: String(page), limit: '25' });
  if (q) params.set('q', q);
  if (filter && cfg.filter) params.set(cfg.filter.key, filter);
  const list = useQuery({ queryKey: ['res', cfg.endpoint, params.toString()], queryFn: () => adminApi<{ items: any[]; total: number }>(`/admin/${cfg.endpoint}?${params}`) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['res', cfg.endpoint] }); qc.invalidateQueries({ queryKey: ['ref'] }); };

  const save = useMutation({
    mutationFn: (e: NonNullable<Editing>) => (e.id ? put(`/admin/${cfg.endpoint}/${e.id}`, e.value) : post(`/admin/${cfg.endpoint}`, e.value)),
    onSuccess: () => { toast('Saved.'); setEditing(null); setError(''); refresh(); },
    onError: (e: any) => setError(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => del(`/admin/${cfg.endpoint}/${id}`),
    onSuccess: () => { toast('Deleted.'); refresh(); },
    onError: (e: any) => toast(e.message, 'err'),
  });
  const dup = useMutation({
    mutationFn: (id: string) => post(`/admin/${cfg.endpoint}/${id}/duplicate`),
    onSuccess: () => { toast('Duplicated as a hidden copy.'); refresh(); },
    onError: (e: any) => toast(e.message, 'err'),
  });

  async function open(id?: string) {
    setError('');
    setTab('edit');
    if (!id) return setEditing({ value: { ...emptyFrom(cfg.fields), ...(cfg.defaults || {}) } });
    try {
      const doc = await adminApi(`/admin/${cfg.endpoint}/${id}`);
      if (cfg.endpoint === 'users') doc.password = '';
      setEditing({ id, value: doc });
    } catch (e: any) { toast(e.message, 'err'); }
  }

  return (
    <>
      <PageTitle title={cfg.title}>
        {cfg.canCreate !== false && <button className="btn-primary !py-2.5" onClick={() => open()}>+ New {cfg.singular}</button>}
      </PageTitle>
      {cfg.help && <p className="mb-6 max-w-3xl text-sm text-graphite/80">{cfg.help}</p>}
      <div className="mb-5 flex flex-wrap gap-3">
        <input className="field max-w-xs" type="search" placeholder={`Search ${cfg.title.toLowerCase()}`} aria-label="Search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        {cfg.filter && (
          <select className="field max-w-[200px]" aria-label={cfg.filter.label} value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}>
            <option value="">All {cfg.filter.label.toLowerCase()}</option>
            {cfg.filter.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
      </div>

      <div className="overflow-x-auto border border-stone bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper text-xs uppercase tracking-wider text-concrete">
            <tr>{cfg.columns.map((c) => <th key={c.label} className="px-4 py-3 font-semibold">{c.label}</th>)}<th className="px-4 py-3 text-right font-semibold">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-stone">
            {list.isLoading && <tr><td className="px-4 py-8 text-concrete" colSpan={cfg.columns.length + 1}>Loading…</td></tr>}
            {list.error && <tr><td role="alert" className="px-4 py-8 text-red-700" colSpan={cfg.columns.length + 1}>Could not load this list.</td></tr>}
            {list.data && !list.data.items.length && <tr><td className="px-4 py-8 text-concrete" colSpan={cfg.columns.length + 1}>Nothing here yet.</td></tr>}
            {list.data?.items.map((i) => (
              <tr key={i._id} className="hover:bg-paper/60">
                {cfg.columns.map((c) => <td key={c.label} className="px-4 py-3 align-middle">{c.render(i)}</td>)}
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <span className="inline-flex items-center gap-4">
                    {cfg.rowActions?.(i)}
                    <button className="font-semibold text-ink hover:text-ember" onClick={() => open(i._id)}>{cfg.endpoint === 'pages' ? 'Settings' : 'Edit'}</button>
                    {cfg.duplicable && <button className="text-concrete hover:text-ink" onClick={() => dup.mutate(i._id)}>Duplicate</button>}
                    {cfg.canDelete !== false && <button className="text-red-700 hover:underline" onClick={() => confirm(`Delete this ${cfg.singular}? This cannot be undone.`) && remove.mutate(i._id)}>Delete</button>}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} total={list.data?.total ?? 0} limit={25} onPage={setPage} />

      {editing && (
        <Drawer
          wide
          title={editing.id ? `Edit ${cfg.singular}` : `New ${cfg.singular}`}
          onClose={() => setEditing(null)}
          footer={tab === 'edit' ? (
            <>
              {error && <p role="alert" className="mr-auto max-w-sm text-sm text-red-700">{error}</p>}
              <button className="btn-outline !py-2.5 text-ink" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-primary !py-2.5 disabled:opacity-60" disabled={save.isPending} onClick={() => save.mutate(editing)}>{save.isPending ? 'Saving…' : 'Save'}</button>
            </>
          ) : undefined}
        >
          {editing.id && cfg.versioned && (
            <div className="mb-6 flex gap-1 border-b border-stone text-sm font-semibold">
              {(['edit', 'history'] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 ${tab === t ? 'border-b-2 border-ember text-ink' : 'text-concrete'}`}>{t === 'edit' ? 'Details' : 'Version history'}</button>
              ))}
            </div>
          )}
          {tab === 'edit'
            ? <FormEngine fields={cfg.fields} value={editing.value} onChange={(v) => setEditing({ ...editing, value: v })} isNew={!editing.id} />
            : <History cfg={cfg} id={editing.id!} onRestored={() => { refresh(); setEditing(null); }} />}
        </Drawer>
      )}
    </>
  );
}

function History({ cfg, id, onRestored }: { cfg: Cfg; id: string; onRestored: () => void }) {
  const toast = useToast();
  const rev = useQuery({ queryKey: ['rev', cfg.endpoint, id], queryFn: () => adminApi<{ items: any[] }>(`/admin/${cfg.endpoint}/${id}/revisions`) });
  const restore = useMutation({
    mutationFn: (rid: string) => post<{ intoDraft: boolean }>(`/admin/${cfg.endpoint}/${id}/revisions/${rid}/restore`),
    onSuccess: (r) => { toast(r.intoDraft ? 'Restored into the page draft. Open the visual editor to review and publish.' : 'Version restored.'); onRestored(); },
    onError: (e: any) => toast(e.message, 'err'),
  });
  if (rev.isLoading) return <p className="text-sm text-concrete">Loading…</p>;
  if (!rev.data?.items.length) return <p className="text-sm text-concrete">No earlier versions yet. A version is saved each time this item is changed.</p>;
  return (
    <ul className="divide-y divide-stone border border-stone">
      {rev.data.items.map((r) => (
        <li key={r._id} className="flex items-center justify-between gap-4 p-4 text-sm">
          <div><p className="font-semibold">{r.label || 'Saved version'}</p><p className="text-xs text-concrete">{fmtDate(r.createdAt)}{r.author?.name ? ` · ${r.author.name}` : ''}</p></div>
          <button className="btn-dark !px-4 !py-2" disabled={restore.isPending} onClick={() => confirm('Restore this version? The current one is kept in history.') && restore.mutate(r._id)}>Restore</button>
        </li>
      ))}
    </ul>
  );
}
