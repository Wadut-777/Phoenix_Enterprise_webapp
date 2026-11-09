import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, del, download, patch, put } from '../lib/adminApi';
import { useAuth } from '../lib/auth';
import { FormEngine } from './FormEngine';
import { Badge, Pager, PageTitle, fmtDate, useToast } from './ui';
import { seoFields, type Field } from '../lib/blockDefs';

/* ---------------- dashboard ---------------- */
const links: Record<string, string> = { pages: '/admin/pages', services: '/admin/services', blogs: '/admin/blog', projects: '/admin/projects' };

export function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({ queryKey: ['dashboard'], queryFn: () => adminApi<any>('/admin/dashboard') });
  const cards: [string, string, string][] = data ? ([
    ['publishedPages', 'Published pages', '/admin/pages'], ['draftPages', 'Draft pages', '/admin/pages'], ['projects', 'Projects', '/admin/projects'],
    ['activeServices', 'Active services', '/admin/services'], ['newEnquiries', 'New enquiries', '/admin/enquiries'], ['newApplications', 'Career applications (new)', '/admin/applications'],
  ] as [string, string, string][]).filter(([k]) => data[k] !== undefined) : [];
  return (
    <>
      <PageTitle title={`Welcome, ${user?.name.split(' ')[0]}`}>
        <Link to="/" className="btn-dark !py-2.5">View website</Link>
      </PageTitle>
      {isLoading ? <p className="text-concrete">Loading…</p> : error ? <p role="alert" className="text-red-700">Could not load the overview.</p> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map(([k, label, to]) => (
              <Link key={k} to={to} className="border border-stone bg-white p-6 transition-shadow hover:shadow-card">
                <p className="font-display text-5xl font-extrabold">{data[k]}</p>
                <p className="mt-2 text-sm font-medium text-concrete">{label}</p>
              </Link>
            ))}
          </div>
          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            {data.recentUpdates && (
              <section>
                <h2 className="mb-3 font-display text-lg font-bold">Recent content updates</h2>
                <ul className="divide-y divide-stone border border-stone bg-white text-sm">
                  {data.recentUpdates.map((r: any) => (
                    <li key={r.id} className="flex items-center justify-between gap-4 px-4 py-3">
                      <Link to={links[r.resource] || '/admin'} className="font-semibold hover:text-ember">{r.title}</Link>
                      <span className="text-xs text-concrete">{r.resource} · {fmtDate(r.updatedAt)}</span>
                    </li>
                  ))}
                  {!data.recentUpdates.length && <li className="px-4 py-6 text-concrete">No updates yet.</li>}
                </ul>
              </section>
            )}
            {data.recentActivity && (
              <section>
                <h2 className="mb-3 font-display text-lg font-bold">Recent activity</h2>
                <ul className="divide-y divide-stone border border-stone bg-white text-sm">
                  {data.recentActivity.map((a: any) => (
                    <li key={a._id} className="px-4 py-3"><p>{a.summary || a.action}</p><p className="text-xs text-concrete">{a.userName || 'Unknown'} · {fmtDate(a.createdAt)}</p></li>
                  ))}
                  {!data.recentActivity.length && <li className="px-4 py-6 text-concrete">Nothing logged yet.</li>}
                </ul>
              </section>
            )}
          </div>
        </>
      )}
    </>
  );
}

/* ---------------- enquiries / applications ---------------- */
function InboxPage({ kind }: { kind: 'enquiries' | 'applications' }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const statuses = kind === 'enquiries' ? ['new', 'read', 'replied', 'closed'] : ['new', 'reviewed', 'shortlisted', 'rejected'];
  const params = new URLSearchParams({ page: String(page) });
  if (q) params.set('q', q);
  if (status) params.set('status', status);
  const list = useQuery({ queryKey: [kind, params.toString()], queryFn: () => adminApi<{ items: any[]; total: number }>(`/admin/${kind}?${params}`) });
  const setSt = useMutation({
    mutationFn: ({ id, s }: { id: string; s: string }) => patch(`/admin/${kind}/${id}`, { status: s }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [kind] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
    onError: (e: any) => toast(e.message, 'err'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => del(`/admin/${kind}/${id}`),
    onSuccess: () => { toast('Deleted.'); qc.invalidateQueries({ queryKey: [kind] }); },
    onError: (e: any) => toast(e.message, 'err'),
  });
  return (
    <>
      <PageTitle title={kind === 'enquiries' ? 'Contact enquiries' : 'Career applications'}>
        {kind === 'enquiries' && <button className="btn-dark !py-2.5" onClick={() => download('/admin/enquiries/export.csv', 'enquiries.csv').catch(() => toast('Export failed.', 'err'))}>Export CSV</button>}
      </PageTitle>
      <div className="mb-5 flex flex-wrap gap-3">
        <input className="field max-w-xs" type="search" placeholder="Search" aria-label="Search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="field max-w-[180px]" aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>{statuses.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="divide-y divide-stone border border-stone bg-white">
        {list.isLoading && <p className="p-6 text-concrete">Loading…</p>}
        {list.error && <p role="alert" className="p-6 text-red-700">Could not load this list.</p>}
        {list.data && !list.data.items.length && <p className="p-6 text-concrete">Nothing here yet.</p>}
        {list.data?.items.map((i) => (
          <article key={i._id} className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button className="text-left" onClick={() => { setOpen(open === i._id ? null : i._id); if (i.status === 'new') setSt.mutate({ id: i._id, s: kind === 'enquiries' ? 'read' : 'reviewed' }); }} aria-expanded={open === i._id}>
                <p className="font-semibold">{i.name} {i.status === 'new' && <Badge tone="amber">New</Badge>}</p>
                <p className="text-xs text-concrete">{kind === 'enquiries' ? (i.service || 'General enquiry') : i.jobTitle} · {fmtDate(i.createdAt)}</p>
              </button>
              <div className="flex items-center gap-3">
                <select className="field !w-auto !py-1.5" aria-label="Status" value={i.status} onChange={(e) => setSt.mutate({ id: i._id, s: e.target.value })}>{statuses.map((s) => <option key={s}>{s}</option>)}</select>
                <button className="text-sm text-red-700 hover:underline" onClick={() => confirm('Delete permanently?') && remove.mutate(i._id)}>Delete</button>
              </div>
            </div>
            {open === i._id && (
              <div className="mt-4 space-y-2 border-t border-stone pt-4 text-sm">
                <p><a className="text-ember" href={`mailto:${i.email}`}>{i.email}</a>{i.phone && <> · <a className="text-ember" href={`tel:${i.phone}`}>{i.phone}</a></>}{i.company && <> · {i.company}</>}</p>
                {kind === 'enquiries' ? <p className="whitespace-pre-wrap">{i.message}</p> : (
                  <>
                    {i.coverNote && <p className="whitespace-pre-wrap">{i.coverNote}</p>}
                    {i.resume?.filename && <button className="btn-dark !py-2" onClick={() => download(`/admin/applications/${i._id}/resume`, i.resume.originalName || 'resume').catch(() => toast('Download failed.', 'err'))}>Download resume</button>}
                  </>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
      <Pager page={page} total={list.data?.total ?? 0} limit={25} onPage={setPage} />
    </>
  );
}
export const Enquiries = () => <InboxPage kind="enquiries" />;
export const Applications = () => <InboxPage kind="applications" />;

/* ---------------- website settings ---------------- */
const t = (key: string, label: string, extra: Partial<Field> = {}): Field => ({ key, label, type: 'text', ...extra });
const settingsFields: Field[] = [
  { key: 'company', label: 'Company', type: 'group', fields: [t('name', 'Company name'), t('tagline', 'Tagline'), { key: 'logo', label: 'Logo', type: 'image' }, { key: 'about', label: 'Short description', type: 'textarea' }] },
  { key: 'contact', label: 'Contact details', type: 'group', fields: [
    { key: 'address', label: 'Office address', type: 'textarea' }, { key: 'phones', label: 'Phone numbers', type: 'lines' }, { key: 'emails', label: 'Email addresses', type: 'lines' },
    t('whatsapp', 'WhatsApp number', { help: 'International format, e.g. +91 98765 43210. Shows the floating WhatsApp button.' }),
    t('hours', 'Opening hours'), t('mapEmbedUrl', 'Google Maps embed link', { help: 'In Google Maps: Share → Embed a map → copy the src="…" address.' }),
  ] },
  { key: 'social', label: 'Social links', type: 'list', itemLabel: 'Link', fields: [t('label', 'Name'), t('url', 'Address')] },
  { key: 'announcement', label: 'Announcement bar', type: 'group', fields: [{ key: 'enabled', label: 'Show the bar', type: 'bool' }, t('text', 'Text'), t('link', 'Link (optional)')] },
  { key: 'header', label: 'Header', type: 'group', fields: [t('ctaLabel', 'Button label'), t('ctaUrl', 'Button link')] },
  { key: 'footer', label: 'Footer', type: 'group', fields: [{ key: 'blurb', label: 'Short text', type: 'textarea' }, t('legal', 'Extra legal line')] },
  { key: 'seoDefaults', label: 'Search defaults', type: 'group', fields: [t('titleSuffix', 'Page title suffix'), { key: 'description', label: 'Default description', type: 'textarea' }, { key: 'ogImage', label: 'Default social image', type: 'image' }] },
];

export function SettingsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [value, setValue] = useState<any>(null);
  const [error, setError] = useState('');
  const load = useQuery({ queryKey: ['settings'], queryFn: async () => { const s = await adminApi<any>('/admin/settings'); setValue(s); return s; }, staleTime: 0 });
  const save = useMutation({
    mutationFn: () => put('/admin/settings', value),
    onSuccess: () => { toast('Settings saved.'); setError(''); qc.invalidateQueries({ queryKey: ['site'] }); },
    onError: (e: any) => setError(e.message),
  });
  return (
    <>
      <PageTitle title="Header, footer & settings">
        <button className="btn-primary !py-2.5 disabled:opacity-60" disabled={save.isPending || !value} onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : 'Save settings'}</button>
      </PageTitle>
      <p className="mb-6 max-w-3xl text-sm text-graphite/80">These appear across the whole website: header button, footer, contact details, social links and the announcement bar. Navigation links are under Navigation menus.</p>
      {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
      {load.isLoading || !value ? <p className="text-concrete">Loading…</p> : <div className="max-w-3xl"><FormEngine fields={settingsFields} value={value} onChange={setValue} isNew={false} /></div>}
    </>
  );
}

/* ---------------- SEO overview ---------------- */
export function SeoPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ['seo-audit'], queryFn: () => adminApi<{ items: any[] }>('/admin/seo-audit') });
  const [onlyIssues, setOnlyIssues] = useState(false);
  const rows = (data?.items ?? []).filter((r) => !onlyIssues || !r.metaTitle || !r.metaDescription);
  const to: Record<string, string> = { pages: '/admin/pages', services: '/admin/services', industries: '/admin/industries', blogs: '/admin/blog', projects: '/admin/projects' };
  const len = (s: string, min: number, max: number) => (!s ? <Badge tone="red">Missing</Badge> : s.length < min || s.length > max ? <Badge tone="amber">{s.length} chars</Badge> : <Badge tone="green">{s.length} chars</Badge>);
  return (
    <>
      <PageTitle title="SEO overview" />
      <p className="mb-6 max-w-3xl text-sm text-graphite/80">Meta titles and descriptions for every page, service, industry, post and project. Open an item to edit its SEO fields. Targets: title 20–60 characters, description 70–160.</p>
      <label className="mb-4 flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#d4501a]" checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} /> Show only items with missing fields</label>
      <div className="overflow-x-auto border border-stone bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper text-xs uppercase tracking-wider text-concrete"><tr>{['Item', 'Type', 'Meta title', 'Meta description', 'Social image', ''].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-stone">
            {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-concrete">Loading…</td></tr>}
            {error && <tr><td colSpan={6} role="alert" className="px-4 py-8 text-red-700">Could not load.</td></tr>}
            {rows.map((r) => (
              <tr key={`${r.resource}-${r.id}`}>
                <td className="px-4 py-3"><strong>{r.title}</strong><br /><code className="text-xs text-concrete">/{r.slug}</code></td>
                <td className="px-4 py-3">{r.type}</td>
                <td className="px-4 py-3">{len(r.metaTitle, 20, 60)}</td>
                <td className="px-4 py-3">{len(r.metaDescription, 70, 160)}</td>
                <td className="px-4 py-3">{r.ogImage ? <Badge tone="green">Set</Badge> : <Badge>Default</Badge>}</td>
                <td className="px-4 py-3 text-right"><Link className="font-semibold text-ember" to={to[r.resource]}>Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
void seoFields;

/* ---------------- activity log ---------------- */
export function ActivityPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useQuery({ queryKey: ['activity', page], queryFn: () => adminApi<{ items: any[]; total: number }>(`/admin/activity?page=${page}`) });
  return (
    <>
      <PageTitle title="Activity log" />
      <div className="overflow-x-auto border border-stone bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper text-xs uppercase tracking-wider text-concrete"><tr>{['When', 'Who', 'Action', 'Details'].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-stone">
            {isLoading && <tr><td colSpan={4} className="px-4 py-8 text-concrete">Loading…</td></tr>}
            {error && <tr><td colSpan={4} role="alert" className="px-4 py-8 text-red-700">Could not load.</td></tr>}
            {data?.items.map((a) => (
              <tr key={a._id}><td className="whitespace-nowrap px-4 py-3">{fmtDate(a.createdAt)}</td><td className="px-4 py-3">{a.userName || '—'}</td><td className="px-4 py-3"><Badge tone={a.action.includes('fail') || a.action === 'token_reuse' ? 'red' : 'grey'}>{a.action}</Badge></td><td className="px-4 py-3">{a.summary}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} total={data?.total ?? 0} limit={50} onPage={setPage} />
    </>
  );
}

/* ---------------- backups ---------------- */
export function BackupsPage() {
  return (
    <>
      <PageTitle title="Backups" />
      <div className="max-w-3xl space-y-4 text-sm leading-relaxed">
        <p>Backups run on the server so the database and uploaded files are captured together. Run these on the VPS from the project folder:</p>
        <pre className="overflow-x-auto bg-ink p-4 text-paper">{`./scripts/backup.sh                        # database + uploads, keeps the latest 14
./scripts/restore.sh backups/<timestamp>   # asks for confirmation, then restores`}</pre>
        <p>Schedule <code>backup.sh</code> nightly with cron and copy the <code>backups/</code> folder off the server. Restoring replaces the current database.</p>
        <p>Individual pages, services, projects and posts also keep their own version history (open the item and choose “Version history”). Every administrative action is recorded in the <Link to="/admin/activity" className="font-semibold text-ember">Activity log</Link>.</p>
      </div>
    </>
  );
}
