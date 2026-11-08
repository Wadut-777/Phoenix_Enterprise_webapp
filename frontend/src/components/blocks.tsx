import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  useCategories, useClients, useFaqs, useIndustries, useProjects, useServices, useTestimonials,
  type Block,
} from '../lib/api';
import { Arrow, Empty, ErrorState, Icon, Img, Loading, RichText, SectionHead, SmartLink } from './ui';
import { ProjectCard, ServiceCard } from './cards';
import { EnquiryForm } from './EnquiryForm';

type P = Record<string, any>;

/** Per-block style overrides (editable later from the visual editor). */
function Wrap({ id, style, children, className = '' }: { id?: string; style?: P; children: ReactNode; className?: string }) {
  const s: P = style || {};
  return (
    <section
      id={id}
      className={className}
      style={{
        backgroundColor: s.background || undefined,
        color: s.color || undefined,
        paddingTop: s.paddingTop ?? undefined,
        paddingBottom: s.paddingBottom ?? undefined,
        textAlign: s.align || undefined,
      }}
    >
      {children}
    </section>
  );
}

const fade = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: 'easeOut' as const },
};

/* ---------------- hero ---------------- */
function Hero({ p }: { p: P }) {
  const compact = p.size === 'compact';
  return (
    <section className={`relative isolate overflow-hidden bg-ink text-paper ${compact ? '' : 'min-h-[88vh]'} flex items-end`}>
      {p.video ? (
        <video className="absolute inset-0 h-full w-full object-cover opacity-50" src={p.video} autoPlay muted loop playsInline poster={p.image || undefined} />
      ) : (
        <Img src={p.image} priority className={`!absolute inset-0 ${p.image ? 'opacity-55' : 'opacity-100'}`} />
      )}
      <div className="absolute inset-0 bg-ink/40" aria-hidden="true" />
      <div className={`container-site relative ${compact ? 'py-20 sm:py-28' : 'pb-20 pt-40 sm:pb-28'}`}>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }}>
          {p.eyebrow && <p className="eyebrow">{p.eyebrow}</p>}
          <h1 className={`max-w-5xl font-display font-extrabold leading-[1.02] ${compact ? 'text-4xl sm:text-6xl' : 'text-5xl sm:text-7xl lg:text-8xl'}`}>
            {p.headline}
          </h1>
          {p.subheadline && <p className="mt-7 max-w-2xl text-lg text-paper/80 sm:text-xl">{p.subheadline}</p>}
          {(p.primaryCta?.label || p.secondaryCta?.label) && (
            <div className="mt-10 flex flex-wrap gap-4">
              {p.primaryCta?.label && <SmartLink to={p.primaryCta.url} className="btn-primary">{p.primaryCta.label}<Arrow /></SmartLink>}
              {p.secondaryCta?.label && <SmartLink to={p.secondaryCta.url} className="btn-outline text-paper">{p.secondaryCta.label}</SmartLink>}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

/* ---------------- intro / text + image ---------------- */
function Intro({ p, style }: { p: P; style?: P }) {
  return (
    <Wrap style={style} className="section">
      <div className="container-site grid gap-14 lg:grid-cols-12">
        <motion.div {...fade} className="lg:col-span-6">
          {p.eyebrow && <p className="eyebrow">{p.eyebrow}</p>}
          <h2 className="h-section">{p.heading}</h2>
          <RichText lines={p.body} className="mt-8" />
          {p.link?.label && (
            <SmartLink to={p.link.url} className="mt-8 inline-flex items-center gap-2 font-semibold text-ember hover:gap-3">
              {p.link.label} <Arrow />
            </SmartLink>
          )}
        </motion.div>
        <div className="lg:col-span-6">
          {p.image && <Img src={p.image} alt={p.heading} className="mb-8 aspect-[16/10] w-full" />}
          <dl className="grid gap-px bg-stone sm:grid-cols-1">
            {(p.highlights || []).map((h: P) => (
              <div key={h.title} className="bg-paper py-6 first:pt-0">
                <dt className="font-display text-lg font-bold">{h.title}</dt>
                <dd className="mt-1 text-graphite/75">{h.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Wrap>
  );
}

function RichTextBlock({ p, style }: { p: P; style?: P }) {
  return (
    <Wrap style={style} className="section">
      <div className="container-site max-w-4xl">
        {p.heading && <h2 className="h-section mb-8">{p.heading}</h2>}
        <RichText lines={p.body} />
      </div>
    </Wrap>
  );
}

function TextImage({ p, style }: { p: P; style?: P }) {
  const right = p.imageSide !== 'left';
  return (
    <Wrap style={style} className="section">
      <div className="container-site grid items-center gap-14 lg:grid-cols-2">
        <div className={right ? '' : 'lg:order-2'}>
          {p.eyebrow && <p className="eyebrow">{p.eyebrow}</p>}
          {p.heading && <h2 className="h-section mb-6">{p.heading}</h2>}
          <RichText lines={p.body} />
        </div>
        <Img src={p.image} alt={p.heading} className="aspect-[4/3] w-full" />
      </div>
    </Wrap>
  );
}

/* ---------------- services ---------------- */
function ServiceGrid({ p, style }: { p: P; style?: P }) {
  const { data, isLoading, error, refetch } = useServices();
  const items = (data?.items ?? []).slice(0, p.limit || 12);
  return (
    <Wrap style={style} className="section bg-white">
      <div className="container-site">
        <SectionHead eyebrow={p.eyebrow} heading={p.heading} intro={p.intro} />
        {isLoading ? <Loading /> : error ? <ErrorState onRetry={refetch} /> : !items.length ? <Empty>No services published yet.</Empty> : (
          <div className="grid gap-px bg-stone sm:grid-cols-2 lg:grid-cols-3 [&>*]:bg-white">
            {items.map((s, i) => <motion.div key={s.slug} {...fade} transition={{ ...fade.transition, delay: (i % 3) * 0.08 }}><ServiceCard s={s} index={i} /></motion.div>)}
          </div>
        )}
      </div>
    </Wrap>
  );
}

/* ---------------- projects ---------------- */
function ProjectGallery({ p, style }: { p: P; style?: P }) {
  const [cat, setCat] = useState('');
  const cats = useCategories();
  const { data, isLoading, error, refetch } = useProjects({ featured: p.featuredOnly ? true : undefined, limit: p.limit || 6 });
  const items = useMemo(() => (data?.items ?? []).filter((i) => !cat || i.category?.slug === cat), [data, cat]);
  const present = new Set((data?.items ?? []).map((i) => i.category?.slug));
  return (
    <Wrap style={style} className="section">
      <div className="container-site">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <SectionHead eyebrow={p.eyebrow} heading={p.heading} intro={p.intro} />
          <Link to="/projects" className="mb-12 inline-flex items-center gap-2 font-semibold text-ember">All projects <Arrow /></Link>
        </div>
        {!!cats.data?.items.length && (data?.items.length ?? 0) > 1 && (
          <div className="-mt-6 mb-10 flex flex-wrap gap-2" role="group" aria-label="Filter projects">
            {[{ slug: '', name: 'All' }, ...cats.data.items.filter((c) => present.has(c.slug))].map((c) => (
              <button
                key={c.slug || 'all'}
                onClick={() => setCat(c.slug)}
                aria-pressed={cat === c.slug}
                className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${cat === c.slug ? 'bg-ink text-paper' : 'bg-stone text-ink hover:bg-ink/10'}`}
              >{c.name}</button>
            ))}
          </div>
        )}
        {isLoading ? <Loading /> : error ? <ErrorState onRetry={refetch} /> : !items.length ? <Empty>No projects to show yet.</Empty> : (
          <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((proj, i) => <motion.div key={proj._id} {...fade} transition={{ ...fade.transition, delay: (i % 3) * 0.08 }}><ProjectCard p={proj} /></motion.div>)}
          </div>
        )}
      </div>
    </Wrap>
  );
}

/* ---------------- feature list (why choose / values) ---------------- */
function FeatureList({ p, style }: { p: P; style?: P }) {
  return (
    <Wrap style={style} className="section bg-ink text-paper">
      <div className="container-site">
        <SectionHead eyebrow={p.eyebrow} heading={p.heading} intro={p.intro} light />
        <div className="grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {(p.items || []).map((it: P, i: number) => (
            <motion.div key={it.title} {...fade} className="border-t border-white/15 pt-6">
              <span className="font-display text-sm font-bold text-ember">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-3 font-display text-xl font-bold">{it.title}</h3>
              <p className="mt-3 leading-relaxed text-paper/70">{it.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </Wrap>
  );
}

/* ---------------- industries ---------------- */
function Industries({ p, style }: { p: P; style?: P }) {
  const { data, isLoading, error, refetch } = useIndustries();
  return (
    <Wrap style={style} className="section">
      <div className="container-site">
        <SectionHead eyebrow={p.eyebrow} heading={p.heading} intro={p.intro} />
        {isLoading ? <Loading /> : error ? <ErrorState onRetry={refetch} /> : !data?.items.length ? <Empty>No industries published yet.</Empty> : (
          <ul className="grid border-l border-t border-stone sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((i) => (
              <li key={i.slug} className="border-b border-r border-stone">
                <Link to={`/industries/${i.slug}`} className="group flex h-full flex-col p-8 transition-colors hover:bg-ink hover:text-paper">
                  <h3 className="font-display text-xl font-bold">{i.name}</h3>
                  <p className="mt-3 flex-1 text-sm text-graphite/75 group-hover:text-paper/70">{i.summary}</p>
                  <span className="mt-6 text-ember"><Arrow className="h-5 w-5 transition-transform group-hover:translate-x-1" /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Wrap>
  );
}

/* ---------------- process ---------------- */
function Process({ p, style }: { p: P; style?: P }) {
  return (
    <Wrap style={style} className="section bg-white">
      <div className="container-site">
        <SectionHead eyebrow={p.eyebrow} heading={p.heading} intro={p.intro} />
        <ol className="grid gap-px bg-stone sm:grid-cols-2 lg:grid-cols-3 [&>*]:bg-white">
          {(p.steps || []).map((s: P, i: number) => (
            <li key={s.title} className="p-8">
              <span className="font-display text-5xl font-extrabold text-ember/90">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-4 font-display text-xl font-bold">{s.title}</h3>
              <p className="mt-2 text-graphite/75">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </Wrap>
  );
}

/* ---------------- stats ---------------- */
function Stats({ p, style }: { p: P; style?: P }) {
  const items = (p.items || []).filter((i: P) => i.value !== '' && i.value != null);
  if (!items.length) return null;
  return (
    <Wrap style={style} className="bg-ember py-16 text-white">
      <div className="container-site">
        {p.heading && <p className="mb-8 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">{p.heading}</p>}
        <dl className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((i: P) => (
            <div key={i.label}>
              <dd className="font-display text-6xl font-extrabold leading-none">{i.value}{i.suffix}</dd>
              <dt className="mt-3 text-sm font-medium uppercase tracking-wider text-white/85">{i.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </Wrap>
  );
}

/* ---------------- clients / testimonials ---------------- */
function Clients({ p, style }: { p: P; style?: P }) {
  const { data } = useClients();
  if (!data?.items.length) return null; // admin controls visibility; hide until logos exist
  return (
    <Wrap style={style} className="section">
      <div className="container-site">
        <SectionHead heading={p.heading} />
        <ul className="grid grid-cols-2 items-center gap-10 sm:grid-cols-3 lg:grid-cols-6">
          {data.items.map((c) => (
            <li key={c._id} className="grid h-20 place-items-center grayscale transition hover:grayscale-0">
              {c.logo ? <img src={c.logo} alt={c.name} loading="lazy" className="max-h-full max-w-full object-contain" /> : <span className="font-display font-bold text-concrete">{c.name}</span>}
            </li>
          ))}
        </ul>
      </div>
    </Wrap>
  );
}

function Testimonials({ p, style }: { p: P; style?: P }) {
  const { data } = useTestimonials();
  if (!data?.items.length) return null;
  return (
    <Wrap style={style} className="section bg-white">
      <div className="container-site">
        <SectionHead heading={p.heading} />
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {data.items.map((t) => (
            <figure key={t._id} className="border-l-2 border-ember bg-paper p-8">
              <blockquote className="text-lg leading-relaxed">“{t.quote}”</blockquote>
              <figcaption className="mt-6 text-sm"><strong className="font-display">{t.author}</strong>{(t.role || t.company) && <span className="text-concrete"> · {[t.role, t.company].filter(Boolean).join(', ')}</span>}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </Wrap>
  );
}

/* ---------------- people, faq, video, cta ---------------- */
function People({ p, style }: { p: P; style?: P }) {
  if (!p.items?.length) return null;
  return (
    <Wrap style={style} className="section">
      <div className="container-site">
        <SectionHead eyebrow={p.eyebrow} heading={p.heading} />
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {p.items.map((m: P) => (
            <div key={m.name}>
              <Img src={m.photo} alt={m.name} className="aspect-[4/5] w-full" />
              <h3 className="mt-4 font-display text-lg font-bold">{m.name}</h3>
              <p className="text-sm text-ember">{m.role}</p>
              {m.bio && <p className="mt-2 text-sm text-graphite/75">{m.bio}</p>}
            </div>
          ))}
        </div>
      </div>
    </Wrap>
  );
}

export function FaqList({ group }: { group?: string }) {
  const { data, isLoading, error, refetch } = useFaqs();
  const [open, setOpen] = useState<string | null>(null);
  if (isLoading) return <Loading />;
  if (error) return <ErrorState onRetry={refetch} />;
  const items = (data?.items ?? []).filter((f) => !group || f.group === group);
  if (!items.length) return <Empty>No FAQs published yet.</Empty>;
  return (
    <div className="divide-y divide-stone border-y border-stone">
      {items.map((f) => (
        <div key={f._id}>
          <h3>
            <button
              className="flex w-full items-center justify-between gap-6 py-6 text-left font-display text-lg font-semibold"
              aria-expanded={open === f._id}
              aria-controls={`faq-${f._id}`}
              onClick={() => setOpen(open === f._id ? null : f._id)}
            >
              {f.question}
              <span className="text-2xl text-ember" aria-hidden="true">{open === f._id ? '−' : '+'}</span>
            </button>
          </h3>
          <div id={`faq-${f._id}`} role="region" hidden={open !== f._id} className="pb-6 pr-10 leading-relaxed text-graphite/80">{f.answer}</div>
        </div>
      ))}
    </div>
  );
}

function Faq({ p, style }: { p: P; style?: P }) {
  return (
    <Wrap style={style} className="section">
      <div className="container-site max-w-4xl">
        <SectionHead eyebrow={p.eyebrow} heading={p.heading} />
        <FaqList group={p.group} />
      </div>
    </Wrap>
  );
}

function Video({ p, style }: { p: P; style?: P }) {
  if (!p.url) return null;
  return (
    <Wrap style={style} className="section">
      <div className="container-site">
        <SectionHead heading={p.heading} />
        <video src={p.url} controls preload="metadata" className="aspect-video w-full bg-ink" />
      </div>
    </Wrap>
  );
}

function Cta({ p, style }: { p: P; style?: P }) {
  return (
    <Wrap style={style} className="section bg-ink text-paper">
      <div className={`container-site grid gap-12 ${p.showForm ? 'lg:grid-cols-2' : ''}`}>
        <div>
          <h2 className="h-section max-w-xl">{p.heading}</h2>
          {p.text && <p className="mt-6 max-w-lg text-lg text-paper/75">{p.text}</p>}
          {!p.showForm && <Link to="/contact" className="btn-primary mt-8">Discuss Your Project <Arrow /></Link>}
        </div>
        {p.showForm && <EnquiryForm dark source="cta" />}
      </div>
    </Wrap>
  );
}

function ContactFormBlock({ p, style }: { p: P; style?: P }) {
  return (
    <Wrap style={style} className="section">
      <div className="container-site max-w-3xl">
        <SectionHead heading={p.heading} intro={p.text} />
        <EnquiryForm source="contact-block" />
      </div>
    </Wrap>
  );
}

/* ---------------- registry ---------------- */
const registry: Record<string, (a: { p: P; style?: P }) => JSX.Element | null> = {
  hero: ({ p }) => <Hero p={p} />,
  intro: Intro,
  richText: RichTextBlock,
  textImage: TextImage,
  serviceGrid: ServiceGrid,
  projectGallery: ProjectGallery,
  featureList: FeatureList,
  industries: Industries,
  process: Process,
  stats: Stats,
  clients: Clients,
  testimonials: Testimonials,
  people: People,
  faq: Faq,
  video: Video,
  cta: Cta,
  contactForm: ContactFormBlock,
};

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b) => {
        const C = registry[b.type];
        return C ? <C key={b.id} p={b.props || {}} style={b.style} /> : null;
      })}
    </>
  );
}

export { Icon };
