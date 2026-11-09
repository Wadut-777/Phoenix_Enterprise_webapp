import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Block } from '../lib/api';

/* Shared by the public blocks and the lazily loaded editor UI. Kept small: it ships with the public bundle. */

export type EditApi = {
  editing: boolean;
  selectedId: string | null;
  select: (id: string | null) => void;
  setProp: (id: string, path: string, value: unknown) => void;
  move: (from: number, to: number) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => void;
  requestAdd: (index: number) => void;
};

export const EditCtx = createContext<EditApi | null>(null);
export const BlockCtx = createContext<{ id: string } | null>(null);
export const useEdit = () => useContext(EditCtx);
export const useEditing = () => !!useContext(EditCtx)?.editing;

export const getPath = (o: any, path: string): any => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
export function setPath(o: any, path: string, v: unknown): any {
  const [head, ...rest] = path.split('.');
  const clone: any = Array.isArray(o) ? [...o] : { ...(o || {}) };
  clone[head] = rest.length ? setPath(o?.[head], rest.join('.'), v) : v;
  return clone;
}

/** Text that is plain on the public site and click-to-edit inside the visual editor. */
export function Txt({ p, k, as = 'span', className = '', multiline = false }: { p: Record<string, any>; k: string; as?: string; className?: string; multiline?: boolean }) {
  const edit = useEdit();
  const blk = useContext(BlockCtx);
  const Tag: any = as;
  const value = getPath(p, k);
  const text = typeof value === 'string' ? value : '';
  if (!edit?.editing || !blk) return text ? <Tag className={className}>{text}</Tag> : null;
  return (
    <Tag
      className={`${className} edit-text`}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      data-ph={k.split('.').pop()}
      onFocus={() => edit.select(blk.id)}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const t = e.currentTarget.innerText.replace(/\n+$/, '');
        if (t !== text) edit.setProp(blk.id, k, t);
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Enter' && !multiline) { e.preventDefault(); e.currentTarget.blur(); }
      }}
    >
      {text}
    </Tag>
  );
}

/** Wraps a block in the editor: selection ring, toolbar, drag handle and drop indicator. */
export function EditFrame({ block, index, count, children }: { block: Block; index: number; count: number; children: ReactNode }) {
  const edit = useEdit()!;
  const [drop, setDrop] = useState<'above' | 'below' | null>(null);
  const selected = edit.selectedId === block.id;
  const btn = 'grid h-8 w-8 place-items-center text-sm text-white hover:bg-ember disabled:opacity-30 disabled:hover:bg-transparent';
  return (
    <div
      data-block={block.id}
      className={`group/edit relative ${selected ? 'outline outline-2 -outline-offset-2 outline-ember' : 'hover:outline hover:outline-1 hover:-outline-offset-1 hover:outline-ember/60'}`}
      onClick={() => edit.select(block.id)}
      onDragOver={(e) => {
        e.preventDefault();
        const r = e.currentTarget.getBoundingClientRect();
        setDrop(e.clientY < r.top + r.height / 2 ? 'above' : 'below');
      }}
      onDragLeave={() => setDrop(null)}
      onDrop={(e) => {
        e.preventDefault();
        const from = Number(e.dataTransfer.getData('text/plain'));
        let to = index + (drop === 'below' ? 1 : 0);
        if (from < to) to -= 1;
        setDrop(null);
        if (Number.isInteger(from) && from !== to) edit.move(from, to);
      }}
    >
      {drop && <div className={`pointer-events-none absolute inset-x-0 z-30 h-1 bg-ember ${drop === 'above' ? 'top-0' : 'bottom-0'}`} />}
      <div className={`absolute right-3 top-3 z-30 flex items-center bg-ink shadow-card ${selected ? 'flex' : 'hidden group-hover/edit:flex'}`} role="toolbar" aria-label={`${block.type} block`}>
        <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-paper/70">{block.type}</span>
        <button type="button" draggable aria-label="Drag to reorder" title="Drag to reorder" className={`${btn} cursor-grab`}
          onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(index)); e.dataTransfer.effectAllowed = 'move'; }}>⠿</button>
        <button type="button" className={btn} aria-label="Move up" disabled={index === 0} onClick={(e) => { e.stopPropagation(); edit.move(index, index - 1); }}>↑</button>
        <button type="button" className={btn} aria-label="Move down" disabled={index === count - 1} onClick={(e) => { e.stopPropagation(); edit.move(index, index + 1); }}>↓</button>
        <button type="button" className={btn} aria-label="Duplicate block" onClick={(e) => { e.stopPropagation(); edit.duplicate(block.id); }}>⧉</button>
        <button type="button" className={btn} aria-label="Delete block" onClick={(e) => { e.stopPropagation(); edit.remove(block.id); }}>✕</button>
      </div>
      <BlockCtx.Provider value={{ id: block.id }}>{children}</BlockCtx.Provider>
    </div>
  );
}

export function InsertBar({ index }: { index: number }) {
  const edit = useEdit()!;
  return (
    <div className="group/ins relative z-20 h-0">
      <button
        type="button"
        onClick={() => edit.requestAdd(index)}
        className="absolute left-1/2 top-0 hidden h-8 -translate-x-1/2 -translate-y-1/2 items-center gap-2 bg-ember px-4 text-xs font-semibold text-white shadow-card group-hover/ins:flex hover:flex focus-visible:flex"
      >
        + Add block here
      </button>
      <div className="absolute inset-x-0 -top-3 h-6" />
    </div>
  );
}

/** Reminder inside blocks whose content comes from a CMS collection rather than the page. */
export function EditNote({ label, to }: { label: string; to: string }) {
  if (!useEditing()) return null;
  return (
    <p className="container-site pb-4 text-xs">
      <a href={to} target="_blank" rel="noreferrer" className="bg-ink px-3 py-1.5 font-semibold uppercase tracking-wider text-paper">{label} ↗</a>
    </p>
  );
}
