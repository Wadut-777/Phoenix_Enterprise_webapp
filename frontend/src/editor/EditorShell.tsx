import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, post, put } from '../lib/adminApi';
import { useAuth } from '../lib/auth';
import { BlockRenderer } from '../components/blocks';
import { EditCtx, setPath, type EditApi } from '../components/edit';
import { ErrorState, Loading } from '../components/ui';
import type { Block } from '../lib/api';
import { blockDefs, seoFields, styleFields, type Field } from '../lib/blockDefs';
import { FormEngine } from '../admin/FormEngine';
import { MediaPickerProvider } from '../admin/MediaLibrary';
import { Modal, ToastProvider, useToast } from '../admin/ui';

type Status = 'saved' | 'dirty' | 'saving' | 'error';
type Device = 'desktop' | 'tablet' | 'mobile';
const WIDTH: Record<Device, string> = { desktop: '100%', tablet: '820px', mobile: '390px' };
const newId = () => Math.random().toString(36).slice(2, 10);
const pageFields: Field[] = [{ key: 'title', label: 'Page title', type: 'text' }, { key: 'seo', label: 'SEO', type: 'group', fields: seoFields }];

export default function EditorShell({ slug }: { slug: string }) {
  return (
    <ToastProvider>
      <MediaPickerProvider>
        <Editor slug={slug} />
      </MediaPickerProvider>
    </ToastProvider>
  );
}

function Editor({ slug }: { slug: string }) {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const qc = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const htmlOk = user?.role === 'admin' || user?.role === 'super_admin';

  const q = useQuery({ queryKey: ['editor-page', slug], queryFn: () => adminApi<any>(`/admin/pages/by-slug/${slug}`), staleTime: 0, gcTime: 0, refetchOnMount: 'always' });

  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const blocksRef = useRef<Block[]>([]);
  const [meta, setMetaState] = useState<{ title: string; seo: any }>({ title: '', seo: {} });
  const metaRef = useRef(meta);
  const verRef = useRef(0);
  const [status, setStatus] = useState<Status>('saved');
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [device, setDevice] = useState<Device>('desktop');
  const [selected, setSelected] = useState<string | null>(null);
  const [panel, setPanel] = useState(true);
  const [tab, setTab] = useState<'content' | 'style'>('content');
  const [adding, setAdding] = useState<number | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [schedule, setSchedule] = useState('');
  const hist = useRef({ past: [] as Block[][], future: [] as Block[][], key: '', at: 0 });

  // Load once: the draft if there is one, otherwise the live version.
  useEffect(() => {
    if (!q.data || blocks) return;
    const d = q.data.draft;
    const b: Block[] = d?.blocks ?? q.data.blocks ?? [];
    blocksRef.current = b;
    setBlocks(b);
    const m = { title: d?.title ?? q.data.title, seo: d?.seo ?? q.data.seo ?? {} };
    metaRef.current = m;
    setMetaState(m);
  }, [q.data, blocks]);

  const commit = useCallback((next: Block[], key = '') => {
    const h = hist.current;
    const now = Date.now();
    if (!(key && key === h.key && now - h.at < 1000)) {
      h.past.push(blocksRef.current);
      if (h.past.length > 100) h.past.shift();
    }
    h.future = [];
    h.key = key;
    h.at = now;
    blocksRef.current = next;
    verRef.current += 1;
    setBlocks(next);
    setStatus('dirty');
  }, []);

  const setMeta = (m: { title: string; seo: any }) => { metaRef.current = m; verRef.current += 1; setMetaState(m); setStatus('dirty'); };

  const undo = useCallback(() => {
    const h = hist.current;
    const prev = h.past.pop();
    if (!prev) return;
    h.future.push(blocksRef.current);
    h.key = '';
    blocksRef.current = prev; verRef.current += 1; setBlocks(prev); setStatus('dirty');
  }, []);
  const redo = useCallback(() => {
    const h = hist.current;
    const next = h.future.pop();
    if (!next) return;
    h.past.push(blocksRef.current);
    h.key = '';
    blocksRef.current = next; verRef.current += 1; setBlocks(next); setStatus('dirty');
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    const id = q.data?._id;
    if (!id) return false;
    const v = verRef.current;
    setStatus('saving');
    try {
      await put(`/admin/pages/${id}/draft`, { blocks: blocksRef.current, title: metaRef.current.title, seo: metaRef.current.seo });
      setStatus(verRef.current === v ? 'saved' : 'dirty');
      return true;
    } catch (e: any) {
      setStatus('error');
      toast(e.message || 'Could not save the draft.', 'err');
      return false;
    }
  }, [q.data, toast]);

  // Autosave 2.5 s after the last change.
  useEffect(() => {
    if (status !== 'dirty') return;
    const t = setTimeout(() => { save(); }, 2500);
    return () => clearTimeout(t);
  }, [status, blocks, meta, save]);

  useEffect(() => {
    if (status === 'saved') return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [status]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 's') { e.preventDefault(); save(); return; }
      const t = e.target as HTMLElement;
      if (t.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
      if (k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      if (k === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save, undo, redo]);

  const insert = (type: string, index: number) => {
    const def = blockDefs[type];
    const b: Block = { id: newId(), type, props: def.defaults(), style: {} };
    const a = [...blocksRef.current];
    a.splice(index, 0, b);
    commit(a);
    setSelected(b.id);
    setPanel(true);
    setAdding(null);
  };

  const api: EditApi = useMemo(() => ({
    editing: true,
    selectedId: selected,
    select: (id) => { setSelected(id); if (id) setPanel(true); },
    setProp: (id, path, value) => commit(blocksRef.current.map((b) => (b.id === id ? { ...b, props: setPath(b.props, path, value) } : b)), `p:${id}:${path}`),
    move: (from, to) => {
      const a = [...blocksRef.current];
      if (from < 0 || to < 0 || from >= a.length || to >= a.length) return;
      const [x] = a.splice(from, 1);
      a.splice(to, 0, x);
      commit(a);
    },
    remove: (id) => {
      if (!confirm('Delete this block?')) return;
      commit(blocksRef.current.filter((b) => b.id !== id));
      setSelected(null);
    },
    duplicate: (id) => {
      const i = blocksRef.current.findIndex((b) => b.id === id);
      if (i < 0) return;
      const src = blocksRef.current[i];
      if (src.type === 'html' && !htmlOk) { toast('Only administrators can duplicate custom HTML blocks.', 'err'); return; }
      const copy: Block = { ...JSON.parse(JSON.stringify(src)), id: newId() };
      const a = [...blocksRef.current];
      a.splice(i + 1, 0, copy);
      commit(a);
      setSelected(copy.id);
    },
    requestAdd: setAdding,
  }), [selected, commit, htmlOk, toast]);

  const exit = () => nav(pathname);
  async function leave() {
    if (status !== 'saved' && !(await save())) { if (!confirm('Your latest changes could not be saved. Leave anyway?')) return; }
    exit();
  }
  async function goPreview() {
    if (status !== 'saved' && !(await save())) return;
    setPreviewKey((k) => k + 1);
    setMode('preview');
  }
  async function publish(scheduled?: string) {
    if (!(await save())) return;
    try {
      await post(`/admin/pages/${q.data._id}/publish`, scheduled ? { schedule: new Date(scheduled).toISOString() } : {});
      qc.invalidateQueries({ queryKey: ['page', slug] });
      qc.invalidateQueries({ queryKey: ['res'] });
      toast(scheduled ? 'Page scheduled.' : 'Published.');
      exit();
    } catch (e: any) { toast(e.message, 'err'); }
  }
  async function discard() {
    if (!confirm('Discard all unpublished changes to this page?')) return;
    try {
      await post(`/admin/pages/${q.data._id}/discard-draft`);
      qc.invalidateQueries({ queryKey: ['page-draft', slug] });
      toast('Draft discarded.');
      exit();
    } catch (e: any) { toast(e.message, 'err'); }
  }

  if (q.isLoading || (q.data && !blocks)) return <Loading label="Loading the editor…" />;
  if (q.error || !q.data || !blocks) return <ErrorState message={(q.error as any)?.status === 404 ? 'This page does not exist in the CMS.' : 'Could not open the editor.'} />;

  const sel = blocks.find((b) => b.id === selected) || null;
  const def = sel ? blockDefs[sel.type] : null;
  const btn = 'px-3 py-2 font-semibold hover:bg-white/10 disabled:opacity-40';
  const label = { saved: 'All changes saved', dirty: 'Unsaved changes…', saving: 'Saving…', error: 'Save failed' }[status];
  const live = q.data.publishState === 'published';

  return (
    <EditCtx.Provider value={api}>
      {mode === 'edit' && <BlockRenderer blocks={blocks} />}
      <div className="h-20" />

      {mode === 'preview' && (
        <div className="fixed inset-0 z-[70] overflow-auto bg-stone pb-14 pt-4">
          <div className="mx-auto h-[calc(100vh-5.5rem)] bg-white shadow-card transition-[width]" style={{ width: WIDTH[device], maxWidth: '100%' }}>
            <iframe key={previewKey} title="Page preview" src={`${pathname}?draft=1&embed=1`} className="h-full w-full border-0" />
          </div>
        </div>
      )}

      {mode === 'edit' && panel && (
        <aside className="fixed bottom-14 right-0 top-[72px] z-[75] flex w-[380px] max-w-full flex-col border-l border-stone bg-white shadow-card" aria-label="Editor panel">
          <header className="flex items-center justify-between border-b border-stone px-4 py-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-concrete">{sel ? 'Selected block' : 'Page'}</p>
              <p className="font-display font-bold">{def ? def.label : 'Page settings'}</p>
            </div>
            <div className="flex items-center gap-1">
              {sel && <button className="px-2 text-xs font-semibold text-concrete hover:text-ink" onClick={() => setSelected(null)}>Page settings</button>}
              <button aria-label="Close panel" className="px-2 text-xl text-concrete hover:text-ink" onClick={() => setPanel(false)}>×</button>
            </div>
          </header>
          {sel && def ? (
            <>
              <div className="flex border-b border-stone text-sm font-semibold">
                {(['content', 'style'] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`flex-1 px-4 py-2 ${tab === t ? 'border-b-2 border-ember' : 'text-concrete'}`}>{t === 'content' ? 'Content' : 'Style & layout'}</button>)}
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {tab === 'content' ? (
                  sel.type === 'html' && !htmlOk
                    ? <p className="text-sm text-concrete">Only administrators can change custom HTML blocks.</p>
                    : <>
                        <p className="mb-4 text-xs text-concrete">Tip: click any text on the page to edit it directly.</p>
                        <FormEngine fields={def.fields} value={sel.props} onChange={(p) => commit(blocks.map((b) => (b.id === sel.id ? { ...b, props: p } : b)), `i:${sel.id}`)} isNew={false} />
                      </>
                ) : (
                  <FormEngine fields={styleFields} value={sel.style || {}} onChange={(s) => commit(blocks.map((b) => (b.id === sel.id ? { ...b, style: s } : b)), `s:${sel.id}`)} isNew={false} />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-4">
              <FormEngine fields={pageFields} value={meta} onChange={setMeta} isNew={false} />
            </div>
          )}
        </aside>
      )}

      <div className="fixed inset-x-0 bottom-0 z-[80] flex h-14 items-center gap-1 overflow-x-auto bg-ink px-3 text-xs text-paper shadow-card" role="toolbar" aria-label="Editor">
        <button className={btn} onClick={leave} title="Return to the normal website view">← Normal view</button>
        <span className="mx-1 h-5 w-px bg-white/20" />
        <button className={`${btn} ${mode === 'edit' ? 'bg-ember' : ''}`} onClick={() => setMode('edit')}>Edit</button>
        <button className={`${btn} ${mode === 'preview' ? 'bg-ember' : ''}`} onClick={goPreview}>Preview</button>
        {mode === 'preview' && (['desktop', 'tablet', 'mobile'] as Device[]).map((d) => (
          <button key={d} className={`${btn} capitalize ${device === d ? 'underline decoration-ember decoration-2 underline-offset-4' : ''}`} onClick={() => setDevice(d)}>{d}</button>
        ))}
        <span className="mx-1 h-5 w-px bg-white/20" />
        <button className={btn} onClick={undo} disabled={!hist.current.past.length || mode !== 'edit'} title="Undo (Ctrl+Z)">Undo</button>
        <button className={btn} onClick={redo} disabled={!hist.current.future.length || mode !== 'edit'} title="Redo (Ctrl+Y)">Redo</button>
        {mode === 'edit' && !panel && <button className={btn} onClick={() => setPanel(true)}>Panel</button>}
        <span className={`ml-auto whitespace-nowrap px-3 ${status === 'error' ? 'text-red-300' : 'text-paper/60'}`} aria-live="polite">{label}</span>
        <button className={btn} onClick={save} disabled={status === 'saved' || status === 'saving'}>Save draft</button>
        <button className="bg-ember px-4 py-2 font-semibold hover:bg-ember-dark" onClick={() => setPublishing(true)}>Publish…</button>
      </div>

      {adding !== null && (
        <Modal title="Add a block" onClose={() => setAdding(null)} size="max-w-3xl">
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(blockDefs).filter(([t]) => t !== 'html' || htmlOk).map(([type, d]) => (
              <button key={type} onClick={() => insert(type, adding)} className="border border-stone p-4 text-left transition-colors hover:border-ember hover:bg-paper">
                <p className="font-display font-bold">{d.label}</p>
                <p className="mt-1 text-sm text-concrete">{d.description}</p>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {publishing && (
        <Modal title="Publish this page" onClose={() => setPublishing(false)} size="max-w-lg">
          <div className="space-y-5 text-sm">
            <p>You're editing a draft. Visitors keep seeing the {live ? 'current live version' : 'page as it is'} until you publish. The live version is saved to Version history first, so you can restore it.</p>
            <button className="btn-primary w-full" onClick={() => publish()}>Publish now</button>
            {!live && (
              <div className="border-t border-stone pt-5">
                <label className="label" htmlFor="sched">Or schedule publication</label>
                <input id="sched" type="datetime-local" className="field mb-3" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
                <button className="btn-dark w-full disabled:opacity-50" disabled={!schedule} onClick={() => publish(schedule)}>Schedule</button>
              </div>
            )}
            {live && <p className="text-xs text-concrete">This page is already live, so changes publish immediately. To schedule a page, set its status to Draft in Pages first.</p>}
            <button className="block w-full text-center text-xs font-semibold text-red-700" onClick={discard}>Discard unpublished changes</button>
          </div>
        </Modal>
      )}
    </EditCtx.Provider>
  );
}
