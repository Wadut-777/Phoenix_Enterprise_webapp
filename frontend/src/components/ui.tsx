import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useSite, type Seo } from '../lib/api';

/* ---------- links ---------- */
export function SmartLink({ to, children, className, ...rest }: { to: string; children: ReactNode; className?: string; [k: string]: any }) {
  if (/^(https?:|mailto:|tel:)/.test(to)) {
    const external = to.startsWith('http');
    return (
      <a href={to} className={className} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...rest}>
        {children}
      </a>
    );
  }
  return <Link to={to} className={className} {...rest}>{children}</Link>;
}

/* ---------- images ---------- */
function Blueprint({ label }: { label?: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-graphite" aria-hidden="true">
      <svg className="h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 300">
        <defs>
          <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M24 0H0V24" fill="none" stroke="#ffffff" strokeOpacity=".07" />
          </pattern>
        </defs>
        <rect width="400" height="300" fill="url(#grid)" />
        <path d="M60 230V120l70-50 70 50v110M200 230V90l60-40 80 60v120M40 230h330" fill="none" stroke="#d4501a" strokeOpacity=".7" strokeWidth="1.5" />
      </svg>
      {label && <span className="absolute bottom-3 left-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">{label}</span>}
    </div>
  );
}

/** Image with lazy loading. Falls back to a neutral blueprint panel when no URL is set. */
export function Img({ src, alt = '', className = '', label, priority = false }: { src?: string; alt?: string; className?: string; label?: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative overflow-hidden bg-graphite ${className}`}>
      {src && !failed ? (
        <img
          src={src}
          srcSet={/-1600\.webp$/.test(src) ? [480, 960, 1600].map((w) => `${src.replace(/-1600\.webp$/, `-${w}.webp`)} ${w}w`).join(', ') : undefined}
          sizes="(min-width: 1280px) 1280px, 100vw"
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <Blueprint label={label} />
      )}
    </div>
  );
}

/* ---------- states ---------- */
export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="container-site py-24" role="status" aria-live="polite">
      <div className="h-1 w-24 animate-pulse bg-ember" />
      <p className="mt-4 text-sm text-concrete">{label}</p>
    </div>
  );
}

export function ErrorState({ message = 'We could not load this content.', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="container-site py-24" role="alert">
      <p className="font-display text-xl font-semibold">{message}</p>
      {onRetry && <button onClick={onRetry} className="btn-dark mt-6">Try again</button>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="border border-dashed border-concrete/50 p-8 text-center text-sm text-concrete">{children}</p>;
}

/* ---------- layout helpers ---------- */
export function SectionHead({ eyebrow, heading, intro, light = false }: { eyebrow?: string; heading?: string; intro?: string; light?: boolean }) {
  if (!eyebrow && !heading && !intro) return null;
  return (
    <div className="mb-12 max-w-3xl">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      {heading && <h2 className={`h-section ${light ? 'text-paper' : ''}`}>{heading}</h2>}
      {intro && <p className={`mt-5 text-lg leading-relaxed ${light ? 'text-paper/70' : 'text-graphite/80'}`}>{intro}</p>}
    </div>
  );
}

export function PageHero({ eyebrow, title, intro, image }: { eyebrow?: string; title: string; intro?: string; image?: string }) {
  return (
    <header className="relative isolate overflow-hidden bg-ink text-paper">
      <Img src={image} className="!absolute inset-0 opacity-40" />
      <div className="container-site relative py-20 sm:py-28">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="max-w-4xl font-display text-4xl font-extrabold leading-[1.05] sm:text-6xl">{title}</h1>
        {intro && <p className="mt-6 max-w-2xl text-lg text-paper/75">{intro}</p>}
      </div>
    </header>
  );
}

export function Breadcrumbs({ trail }: { trail: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="border-b border-stone bg-paper">
      <ol className="container-site flex flex-wrap items-center gap-2 py-4 text-xs text-concrete">
        <li><Link to="/" className="hover:text-ember">Home</Link></li>
        {trail.map((t, i) => (
          <li key={i} className="flex items-center gap-2">
            <span aria-hidden="true">/</span>
            {t.to ? <Link to={t.to} className="hover:text-ember">{t.label}</Link> : <span aria-current="page" className="text-ink">{t.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Paragraph renderer. Supports "## Heading" and "- list item" lines. React escapes all text. */
export function RichText({ lines, className = '' }: { lines?: string[]; className?: string }) {
  if (!lines?.length) return null;
  return (
    <div className={`space-y-5 text-lg leading-relaxed text-graphite/90 ${className}`}>
      {lines.map((l, i) =>
        l.startsWith('## ') ? <h3 key={i} className="pt-4 font-display text-2xl font-bold text-ink">{l.slice(3)}</h3>
        : l.startsWith('- ') ? <p key={i} className="flex gap-3"><span className="mt-3 h-1.5 w-1.5 shrink-0 bg-ember" />{l.slice(2)}</p>
        : <p key={i}>{l}</p>,
      )}
    </div>
  );
}

/* ---------- icons ---------- */
const paths: Record<string, string> = {
  building: 'M4 21V7l8-4 8 4v14M9 21v-6h6v6M8 10h.01M12 10h.01M16 10h.01',
  factory: 'M3 21V11l6 3V11l6 3V6h6v15zM7 17h2M12 17h2M17 17h2',
  ruler: 'M3 17 17 3l4 4L7 21zM8 12l2 2M11 9l2 2M14 6l2 2',
  warehouse: 'M3 21V9l9-5 9 5v12M7 21v-7h10v7M7 17h10',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  shield: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6zM9 12l2 2 4-4',
  signal: 'M5 19a10 10 0 0 1 0-14M19 5a10 10 0 0 1 0 14M8.5 15.5a5 5 0 0 1 0-7M15.5 8.5a5 5 0 0 1 0 7M12 12h.01',
  gauge: 'M4 18a8 8 0 1 1 16 0M12 18l4-6M7 14h.01M12 8v.01M17 14h.01',
  wrench: 'M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.4 2.4-2.6-.6-.6-2.6z',
  users: 'M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M22 20v-2a4 4 0 0 0-3-3.9M16 3.1a3.5 3.5 0 0 1 0 6.8',
};
export function Icon({ name, className = 'h-7 w-7' }: { name?: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" className={className} aria-hidden="true">
      <path d={paths[name || ''] || 'M4 4h16v16H4z'} />
    </svg>
  );
}

export function Arrow({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d="M4 12h16M14 6l6 6-6 6" />
    </svg>
  );
}

/* ---------- SEO ---------- */
function setMeta(attr: 'name' | 'property', key: string, content?: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!content) { el?.remove(); return; }
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute('content', content);
}

export function useSeo(opts: { seo?: Seo; title?: string; description?: string; image?: string; jsonLd?: object | null }) {
  const { data } = useSite();
  const s = data?.settings;
  const suffix = s?.seoDefaults?.titleSuffix || s?.company?.name || 'Phoenix Enterprise';
  const title = opts.seo?.metaTitle || (opts.title ? `${opts.title} | ${suffix}` : suffix);
  const description = opts.seo?.metaDescription || opts.description || s?.seoDefaults?.description;
  const image = opts.seo?.ogImage || opts.image || s?.seoDefaults?.ogImage;
  const canonical = opts.seo?.canonicalUrl || window.location.origin + window.location.pathname;
  const ld = JSON.stringify(opts.jsonLd ?? null);

  useEffect(() => {
    document.title = title;
    setMeta('name', 'description', description);
    setMeta('name', 'robots', opts.seo?.noIndex ? 'noindex,nofollow' : undefined);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:image', image);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:url', canonical);
    setMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
    link.href = canonical;
    document.getElementById('page-jsonld')?.remove();
    if (ld !== 'null') {
      const script = document.createElement('script');
      script.id = 'page-jsonld';
      script.type = 'application/ld+json';
      script.text = ld;
      document.head.appendChild(script);
    }
  }, [title, description, image, canonical, ld, opts.seo?.noIndex]);
}
