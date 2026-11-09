import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, del, patch } from '../lib/adminApi';
import { Modal, Pager, useToast, PageTitle } from './ui';

export type MediaItem = {
  _id: string; originalName: string; kind: 'image' | 'video'; url: string; width?: number; height?: number;
  size?: number; alt: string; category: string; tags: string[]; createdAt: string;
};

/** Smallest generated rendition for thumbnails (files end in -1600.webp). */
export const thumb = (url: string) => (url || '').replace(/-1600\.webp$/, '-480.webp');
const fmtSize = (n?: number) => (n ? (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`) : '');

type PickOpts = { kind?: 'image' | 'video'; onPick: (m: MediaItem) => void };
const PickerCtx = createContext<(o: PickOpts) => void>(() => {});
export const useMediaPicker = () => useContext(PickerCtx);

export function MediaPickerProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<PickOpts | null>(null);
  return (
    <PickerCtx.Provider value={setOpts}>
      {children}
      {opts && (
        <Modal title={opts.kind === 'video' ? 'Choose a video' : 'Choose an image'} onClose={() => setOpts(null)}>
          <MediaLibrary kind={opts.kind} onPick={(m) => { opts.onPick(m); setOpts(null); }} />
        </Modal>
      )}
    </PickerCtx.Provider>
  );
}

export function MediaLibrary({ kind, onPick }: { kind?: 'image' | 'video'; onPick?: (m: MediaItem) => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<MediaItem | null>(null);
  const [uploadCat, setUploadCat] = useState('General');
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const params = new URLSearchParams({ page: String(page), limit: '30' });
  if (q) params.set('q', q);
  if (category) params.set('category', category);
  if (kind) params.set('kind', kind);
  const list = useQuery({ queryKey: ['media', params.toString()], queryFn: () => adminApi<{ items: MediaItem[]; total: number; categories: string[] }>(`/admin/media?${params}`) });

  async function upload(files: FileList | File[]) {
    const arr = Array.from(files);
    if (!arr.length) return;
    setBusy(true);
    const fd = new FormData();
    arr.forEach((f) => fd.append('files', f));
    fd.append('category', uploadCat || 'General');
    try {
      const r = await adminApi<{ items: MediaItem[]; errors: { name: string; error: string }[] }>('/admin/media', { method: 'POST', body: fd });
      toast(`Uploaded ${r.items.length} file(s).`);
      r.errors.forEach((e) => toast(`${e.name}: ${e.error}`, 'err'));
      qc.invalidateQueries({ queryKey: ['media'] });
    } catch (e: any) {
      toast(e.message || 'Upload failed.', 'err');
    } finally {
      setBusy(false);
      if (file.current) file.current.value = '';
    }
  }

  const save = useMutation({
    mutationFn: (m: Partial<MediaItem> & { _id: string }) => patch<MediaItem>(`/admin/media/${m._id}`, m),
    onSuccess: (m) => { setSel(m); qc.invalidateQueries({ queryKey: ['media'] }); toast('Saved.'); },
    onError: (e: any) => toast(e.message, 'err'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => del(`/admin/media/${id}`),
    onSuccess: () => { setSel(null); qc.invalidateQueries({ queryKey: ['media'] }); toast('Deleted.'); },
    onError: (e: any) => toast(e.message, 'err'),
  });

  return (
    <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files); }}>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input className="field max-w-xs" type="search" placeholder="Search files" aria-label="Search files" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="field max-w-[180px]" aria-label="Category" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          <option value="">All categories</option>
          {list.data?.categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <input className="field w-36" list="media-cats" value={uploadCat} onChange={(e) => setUploadCat(e.target.value)} aria-label="Upload into category" />
          <datalist id="media-cats">{list.data?.categories.map((c) => <option key={c} value={c} />)}</datalist>
          <input ref={file} type="file" multiple hidden accept="image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm" onChange={(e) => e.target.files && upload(e.target.files)} />
          <button className="btn-primary !py-2.5" disabled={busy} onClick={() => file.current?.click()}>{busy ? 'Uploading…' : 'Upload files'}</button>
        </div>
      </div>
      <p className="mb-4 text-xs text-concrete">Drop files anywhere here. JPG, PNG, WebP, AVIF, GIF (25 MB), MP4, WebM (60 MB). Images are resized and converted to WebP automatically.</p>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div>
          {list.isLoading ? <p className="text-sm text-concrete">Loading…</p> : list.error ? <p role="alert" className="text-sm text-red-700">Could not load media.</p> : !list.data?.items.length ? (
            <p className="border border-dashed border-concrete/50 p-10 text-center text-sm text-concrete">No files yet. Upload your first image.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {list.data.items.map((m) => (
                <li key={m._id}>
                  <button
                    type="button"
                    onClick={() => (onPick ? setSel(m) : setSel(m))}
                    onDoubleClick={() => onPick?.(m)}
                    className={`group block w-full text-left ${sel?._id === m._id ? 'outline outline-2 outline-ember' : ''}`}
                  >
                    <div className="aspect-square overflow-hidden bg-stone">
                      {m.kind === 'image' ? <img src={thumb(m.url)} alt={m.alt} loading="lazy" className="h-full w-full object-cover" /> : <video src={m.url} muted className="h-full w-full object-cover" />}
                    </div>
                    <p className="mt-1 truncate text-xs">{m.originalName}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Pager page={page} total={list.data?.total ?? 0} limit={30} onPage={setPage} />
        </div>

        <aside className="border border-stone p-4 text-sm lg:sticky lg:top-0 lg:self-start">
          {!sel ? <p className="text-concrete">Select a file to see its details.</p> : (
            <div className="space-y-3">
              <div className="aspect-video overflow-hidden bg-stone">
                {sel.kind === 'image' ? <img src={thumb(sel.url)} alt={sel.alt} className="h-full w-full object-contain" /> : <video src={sel.url} controls className="h-full w-full" />}
              </div>
              <p className="break-all text-xs text-concrete">{sel.width ? `${sel.width}×${sel.height} · ` : ''}{fmtSize(sel.size)}</p>
              <MediaEdit key={sel._id} m={sel} onSave={(v) => save.mutate({ _id: sel._id, ...v })} saving={save.isPending} />
              <button type="button" className="text-xs font-semibold text-ember" onClick={() => navigator.clipboard?.writeText(sel.url).then(() => toast('URL copied.'))}>Copy URL</button>
              {onPick && <button type="button" className="btn-primary w-full !py-2.5" onClick={() => onPick(sel)}>Use this file</button>}
              <button type="button" className="block text-xs font-semibold text-red-700" onClick={() => confirm('Delete this file permanently? Pages that use it will show a placeholder.') && remove.mutate(sel._id)}>Delete file</button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function MediaEdit({ m, onSave, saving }: { m: MediaItem; onSave: (v: { alt: string; category: string; tags: string[] }) => void; saving: boolean }) {
  const [alt, setAlt] = useState(m.alt || '');
  const [cat, setCat] = useState(m.category || 'General');
  const [tags, setTags] = useState((m.tags || []).join(', '));
  return (
    <div className="space-y-2">
      <label className="label" htmlFor="m-alt">Alt text</label>
      <input id="m-alt" className="field" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Describe the image" />
      <label className="label" htmlFor="m-cat">Category</label>
      <input id="m-cat" className="field" value={cat} onChange={(e) => setCat(e.target.value)} />
      <label className="label" htmlFor="m-tags">Tags</label>
      <input id="m-tags" className="field" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="comma, separated" />
      <button type="button" className="btn-dark w-full !py-2" disabled={saving} onClick={() => onSave({ alt, category: cat, tags: tags.split(',').map((t) => t.trim()).filter(Boolean) })}>Save details</button>
    </div>
  );
}

export function MediaPage() {
  return (
    <>
      <PageTitle title="Media library" />
      <MediaLibrary />
    </>
  );
}
