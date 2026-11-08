import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useCategories, useProject, useProjects } from '../lib/api';
import { ServiceCard, ProjectCard } from '../components/cards';
import { Breadcrumbs, Empty, ErrorState, Img, Loading, PageHero, RichText, SectionHead, useSeo } from '../components/ui';
import { EnquiryForm } from '../components/EnquiryForm';
import { NotFound } from './core';

export function ProjectsPage() {
  useSeo({ title: 'Projects', description: 'Browse completed and ongoing projects by Phoenix Enterprise.' });
  const [sp, setSp] = useSearchParams();
  const category = sp.get('category') || '';
  const status = sp.get('status') || '';
  const q = sp.get('q') || '';
  const [layout, setLayout] = useState<'grid' | 'masonry'>('grid');
  const [text, setText] = useState(q);
  const cats = useCategories();
  const { data, isLoading, error, refetch } = useProjects({ category, status, q, limit: 60 });

  // Debounce search input into the URL
  useEffect(() => {
    const t = setTimeout(() => {
      if (text === q) return;
      const next = new URLSearchParams(sp);
      text ? next.set('q', text) : next.delete('q');
      setSp(next, { replace: true });
    }, 350);
    return () => clearTimeout(t);
  }, [text]);

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(sp);
    v ? next.set(k, v) : next.delete(k);
    setSp(next, { replace: true });
  };
  const chip = (active: boolean) => `px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${active ? 'bg-ink text-paper' : 'bg-stone hover:bg-ink/10'}`;

  return (
    <>
      <PageHero eyebrow="Portfolio" title="Our projects" intro="Completed and ongoing work across construction, interiors, engineering and infrastructure." />
      <Breadcrumbs trail={[{ label: 'Projects' }]} />
      <section className="section">
        <div className="container-site">
          <div className="mb-10 flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
                <button className={chip(!category)} aria-pressed={!category} onClick={() => set('category', '')}>All</button>
                {cats.data?.items.map((c) => <button key={c.slug} className={chip(category === c.slug)} aria-pressed={category === c.slug} onClick={() => set('category', c.slug)}>{c.name}</button>)}
              </div>
              <div className="flex gap-2" role="group" aria-label="Layout">
                <button className={chip(layout === 'grid')} aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')}>Grid</button>
                <button className={chip(layout === 'masonry')} aria-pressed={layout === 'masonry'} onClick={() => setLayout('masonry')}>Masonry</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="sr-only" htmlFor="proj-search">Search projects</label>
              <input id="proj-search" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search by title, client or location" className="field max-w-md" />
              <label className="sr-only" htmlFor="proj-status">Status</label>
              <select id="proj-status" value={status} onChange={(e) => set('status', e.target.value)} className="field max-w-[200px]">
                <option value="">All statuses</option>
                <option value="Completed">Completed</option>
                <option value="Ongoing">Ongoing</option>
              </select>
            </div>
          </div>

          {isLoading ? <Loading /> : error ? <ErrorState onRetry={refetch} /> : !data?.items.length ? <Empty>No projects match your filters.</Empty> : layout === 'grid' ? (
            <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">{data.items.map((p) => <ProjectCard key={p._id} p={p} />)}</div>
          ) : (
            <div className="gap-8 sm:columns-2 lg:columns-3">
              {data.items.map((p, i) => <div key={p._id} className="mb-10 break-inside-avoid"><ProjectCard p={p} tall={i % 3 === 1} /></div>)}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export function ProjectDetail() {
  const { slug = '' } = useParams();
  const { data, isLoading, error, refetch } = useProject(slug);
  const p = data?.project;
  const [active, setActive] = useState<string | null>(null);
  useSeo({
    seo: p?.seo, title: p?.title, description: p?.summary, image: p?.coverImage,
    jsonLd: p && { '@context': 'https://schema.org', '@type': 'CreativeWork', name: p.title, description: p.summary, ...(p.coverImage ? { image: p.coverImage } : {}) },
  });
  if (isLoading) return <Loading />;
  if (error?.status === 404) return <NotFound />;
  if (error || !data || !p) return <ErrorState onRetry={refetch} />;

  const facts: [string, string | undefined][] = [
    ['Category', p.category?.name],
    ['Client', p.client && p.client !== 'To be updated' ? p.client : undefined],
    ['Location', p.location && p.location !== 'To be updated' ? p.location : undefined],
    ['Status', p.projectStatus],
    ['Completed', p.completionDate ? new Date(p.completionDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : undefined],
  ];

  return (
    <>
      <PageHero eyebrow={p.category?.name} title={p.title} intro={p.summary} image={p.coverImage} />
      <Breadcrumbs trail={[{ label: 'Projects', to: '/projects' }, { label: p.title }]} />
      <section className="section">
        <div className="container-site grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-8">
            {p.isPlaceholder && <p className="mb-8 border-l-2 border-ember bg-stone px-5 py-3 text-sm">Sample project. Replace this entry with real project details from the CMS.</p>}
            <RichText lines={p.description} />
            {!!p.scope.length && (
              <>
                <h2 className="mt-12 font-display text-3xl font-bold">Project scope</h2>
                <ul className="mt-6 divide-y divide-stone border-y border-stone">{p.scope.map((s) => <li key={s} className="py-4">{s}</li>)}</ul>
              </>
            )}
          </div>
          <aside className="lg:col-span-4">
            <dl className="divide-y divide-stone border-y border-stone">
              {facts.filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 py-4 text-sm"><dt className="font-semibold uppercase tracking-wider text-concrete">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
              ))}
            </dl>
          </aside>
        </div>
      </section>

      {!!p.beforeAfter.length && (
        <section className="section bg-white">
          <div className="container-site">
            <SectionHead eyebrow="Transformation" heading="Before & after" />
            <div className="grid gap-10">
              {p.beforeAfter.map((b, i) => (
                <figure key={i} className="grid gap-4 sm:grid-cols-2">
                  <div><Img src={b.before} alt="Before" className="aspect-[4/3]" /><figcaption className="mt-2 text-xs font-semibold uppercase tracking-wider">Before</figcaption></div>
                  <div><Img src={b.after} alt="After" className="aspect-[4/3]" /><figcaption className="mt-2 text-xs font-semibold uppercase tracking-wider">After</figcaption></div>
                  {b.caption && <p className="text-sm text-concrete sm:col-span-2">{b.caption}</p>}
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {!!p.gallery.length && (
        <section className="section">
          <div className="container-site">
            <SectionHead eyebrow="Gallery" heading="Project photographs" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {p.gallery.map((g) => (
                <button key={g.url} onClick={() => setActive(g.url)} aria-label={`Enlarge: ${g.alt || p.title}`} className="block">
                  <Img src={g.url} alt={g.alt || p.title} className="aspect-[4/3] w-full transition-opacity hover:opacity-90" />
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
      {active && (
        <div role="dialog" aria-modal="true" aria-label="Image preview" className="fixed inset-0 z-[60] grid place-items-center bg-ink/95 p-4" onClick={() => setActive(null)} onKeyDown={(e) => e.key === 'Escape' && setActive(null)}>
          <button className="absolute right-5 top-5 text-4xl text-paper" aria-label="Close" autoFocus onClick={() => setActive(null)}>×</button>
          <img src={active} alt="" className="max-h-full max-w-full object-contain" />
        </div>
      )}

      {!!data.services.length && (
        <section className="section bg-white">
          <div className="container-site">
            <SectionHead eyebrow="Delivered through" heading="Services used" />
            <div className="grid gap-px bg-stone sm:grid-cols-2 lg:grid-cols-3 [&>*]:bg-white">{data.services.map((s) => <ServiceCard key={s.slug} s={s} />)}</div>
          </div>
        </section>
      )}

      {!!data.related.length && (
        <section className="section">
          <div className="container-site">
            <SectionHead heading="More in this category" />
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">{data.related.map((r) => <ProjectCard key={r._id} p={r} />)}</div>
          </div>
        </section>
      )}

      <section className="section bg-ink text-paper">
        <div className="container-site grid gap-12 lg:grid-cols-2">
          <div><h2 className="h-section">Planning something similar?</h2><p className="mt-6 text-lg text-paper/75">Tell us about your project. <Link to="/services" className="text-ember underline">Explore our services</Link>.</p></div>
          <EnquiryForm dark source={`project:${p.slug}`} />
        </div>
      </section>
    </>
  );
}
