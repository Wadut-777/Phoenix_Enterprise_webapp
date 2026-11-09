import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../lib/adminApi';
import { emptyFrom, type Field } from '../lib/blockDefs';
import { useMediaPicker, thumb } from './MediaLibrary';

type Props = { fields: Field[]; value: any; onChange: (v: any) => void; isNew?: boolean };

export function FormEngine({ fields, value, onChange, isNew = true }: Props) {
  const v = value || {};
  return (
    <div className="space-y-5">
      {fields.map((f) => (
        <FieldRow key={f.key} f={f} v={v[f.key]} isNew={isNew} set={(nv) => onChange({ ...v, [f.key]: nv })} />
      ))}
    </div>
  );
}

const join = (arr: unknown, sep: string) => (Array.isArray(arr) ? arr.join(sep) : '');
const parseParas = (t: string) => t.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
const parseLines = (t: string) => t.split('\n').map((s) => s.trim()).filter(Boolean);
const parseTags = (t: string) => t.split(',').map((s) => s.trim()).filter(Boolean);

/** Textarea backed by an array. Keeps local text so trailing newlines and commas survive while typing. */
function ArrayText({ id, value, parse, sep, rows, placeholder, onChange }: { id: string; value: unknown; parse: (t: string) => string[]; sep: string; rows: number; placeholder?: string; onChange: (a: string[]) => void }) {
  const [text, setText] = useState(join(value, sep));
  const last = useRef(JSON.stringify(value ?? []));
  useEffect(() => {
    const incoming = JSON.stringify(value ?? []);
    if (incoming !== last.current) { last.current = incoming; setText(join(value, sep)); }
  }, [value, sep]);
  return (
    <textarea
      id={id}
      rows={rows}
      className="field"
      placeholder={placeholder}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const parsed = parse(e.target.value);
        last.current = JSON.stringify(parsed);
        onChange(parsed);
      }}
    />
  );
}

function useRefOptions(source?: string) {
  return useQuery({
    queryKey: ['ref', source],
    enabled: !!source,
    staleTime: 60_000,
    queryFn: () => adminApi<{ items: any[] }>(`/admin/${source}?limit=100`),
  });
}

function MediaField({ f, v, set }: { f: Field; v: any; set: (v: any) => void }) {
  const pick = useMediaPicker();
  const kind = f.type === 'video' ? 'video' : 'image';
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-20 w-28 shrink-0 place-items-center overflow-hidden bg-stone text-[10px] uppercase text-concrete">
        {v ? (kind === 'image' ? <img src={thumb(v)} alt="" className="h-full w-full object-cover" /> : <video src={v} className="h-full w-full object-cover" muted />) : 'None'}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-dark !px-4 !py-2" onClick={() => pick({ kind, onPick: (m) => set(m.url) })}>Choose from library</button>
          {v && <button type="button" className="btn-outline !px-4 !py-2 text-ink" onClick={() => set('')}>Remove</button>}
        </div>
        <input className="field" value={v || ''} onChange={(e) => set(e.target.value)} placeholder="…or paste a URL" aria-label={`${f.label} URL`} />
      </div>
    </div>
  );
}

function FieldRow({ f, v, set, isNew }: { f: Field; v: any; set: (v: any) => void; isNew: boolean }) {
  const id = useId();
  const refs = useRefOptions(f.type === 'ref' || f.type === 'multiref' ? f.source : undefined);
  const wrap = (child: React.ReactNode, hideLabel = false) => (
    <div>
      {!hideLabel && <label className="label" htmlFor={id}>{f.label}</label>}
      {child}
      {f.help && <p className="mt-1 text-xs text-concrete">{f.help}</p>}
    </div>
  );

  switch (f.type) {
    case 'text':
      return wrap(<input id={id} className="field" value={v ?? ''} placeholder={f.placeholder} disabled={f.readOnlyOnEdit && !isNew} onChange={(e) => set(e.target.value)} />);
    case 'password':
      return wrap(<input id={id} type="password" autoComplete="new-password" className="field" value={v ?? ''} placeholder={isNew ? '' : 'Leave blank to keep the current password'} onChange={(e) => set(e.target.value)} />);
    case 'textarea':
      return wrap(<textarea id={id} rows={4} className="field" value={v ?? ''} placeholder={f.placeholder} onChange={(e) => set(e.target.value)} />);
    case 'number':
      return wrap(<input id={id} type="number" className="field" value={v ?? ''} onChange={(e) => set(e.target.value === '' ? null : Number(e.target.value))} />);
    case 'bool':
      return (
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4 accent-[#d4501a]" checked={!!v} onChange={(e) => set(e.target.checked)} />
          {f.label}
          {f.help && <span className="text-xs font-normal text-concrete">({f.help})</span>}
        </label>
      );
    case 'select':
      return wrap(
        <select id={id} className="field" value={v ?? ''} onChange={(e) => set(e.target.value)}>
          {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>,
      );
    case 'date':
      return wrap(<input id={id} type="date" className="field" value={v ? String(v).slice(0, 10) : ''} onChange={(e) => set(e.target.value || null)} />);
    case 'datetime': {
      const local = v ? new Date(new Date(v).getTime() - new Date(v).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
      return wrap(<input id={id} type="datetime-local" className="field" value={local} onChange={(e) => set(e.target.value ? new Date(e.target.value).toISOString() : null)} />);
    }
    case 'color':
      return wrap(
        <div className="flex items-center gap-3">
          <input id={id} type="color" className="h-10 w-14 cursor-pointer border border-stone bg-white p-1" value={/^#[0-9a-f]{6}$/i.test(v || '') ? v : '#ffffff'} onChange={(e) => set(e.target.value)} />
          <span className="text-xs text-concrete">{v || 'Default'}</span>
          {v && <button type="button" className="text-xs font-semibold text-ember" onClick={() => set('')}>Reset</button>}
        </div>,
      );
    case 'image':
    case 'video':
      return wrap(<MediaField f={f} v={v} set={set} />, false);
    case 'paras':
      return wrap(<ArrayText id={id} value={v} parse={parseParas} sep={'\n\n'} rows={6} onChange={set} />);
    case 'lines':
      return wrap(<ArrayText id={id} value={v} parse={parseLines} sep={'\n'} rows={4} placeholder="One per line" onChange={set} />);
    case 'tags':
      return wrap(<ArrayText id={id} value={v} parse={parseTags} sep={', '} rows={2} placeholder="Comma separated" onChange={set} />);
    case 'group':
      return (
        <fieldset className="border border-stone p-4">
          <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-graphite">{f.label}</legend>
          <FormEngine fields={f.fields || []} value={v} onChange={set} isNew={isNew} />
        </fieldset>
      );
    case 'ref':
    case 'multiref': {
      const vk = f.valueKey || 'slug';
      const lk = f.labelKey || 'title';
      const opts = (refs.data?.items || []).map((i) => ({ value: String(i[vk]), label: i[lk] || i.name || i.title || i[vk] }));
      if (f.type === 'ref') {
        const cur = v && typeof v === 'object' ? v._id : v;
        return wrap(
          <select id={id} className="field" value={cur ?? ''} onChange={(e) => set(e.target.value || null)}>
            <option value="">None</option>
            {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>,
        );
      }
      const sel: string[] = Array.isArray(v) ? v : [];
      return (
        <fieldset>
          <legend className="label">{f.label}</legend>
          <div className="grid max-h-48 gap-1 overflow-y-auto border border-stone bg-white p-3 text-sm">
            {opts.map((o) => (
              <label key={o.value} className="flex items-center gap-2">
                <input type="checkbox" className="accent-[#d4501a]" checked={sel.includes(o.value)} onChange={(e) => set(e.target.checked ? [...sel, o.value] : sel.filter((x) => x !== o.value))} />
                {o.label}
              </label>
            ))}
            {!opts.length && <span className="text-concrete">{refs.isLoading ? 'Loading…' : 'Nothing to choose from yet.'}</span>}
          </div>
        </fieldset>
      );
    }
    case 'list': {
      const items: any[] = Array.isArray(v) ? v : [];
      const move = (i: number, d: number) => {
        const next = [...items];
        const j = i + d;
        if (j < 0 || j >= next.length) return;
        [next[i], next[j]] = [next[j], next[i]];
        set(next);
      };
      return (
        <fieldset>
          <legend className="label">{f.label}</legend>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="border border-stone bg-paper/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-concrete">{f.itemLabel || 'Item'} {i + 1}</span>
                  <div className="flex gap-1 text-sm">
                    <button type="button" aria-label="Move up" className="px-2 hover:text-ember" onClick={() => move(i, -1)}>↑</button>
                    <button type="button" aria-label="Move down" className="px-2 hover:text-ember" onClick={() => move(i, 1)}>↓</button>
                    <button type="button" aria-label="Remove" className="px-2 hover:text-red-700" onClick={() => set(items.filter((_, k) => k !== i))}>✕</button>
                  </div>
                </div>
                <FormEngine fields={f.fields || []} value={item} onChange={(nv) => set(items.map((x, k) => (k === i ? nv : x)))} isNew={isNew} />
              </div>
            ))}
            <button type="button" className="btn-outline !py-2 text-ink" onClick={() => set([...items, emptyFrom(f.fields || [])])}>+ Add {(f.itemLabel || 'item').toLowerCase()}</button>
          </div>
        </fieldset>
      );
    }
    default:
      return null;
  }
}
