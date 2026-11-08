import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSite, type MenuItem, type Settings } from '../lib/api';
import { SmartLink } from './ui';

function Brand({ settings, light = true }: { settings?: Settings; light?: boolean }) {
  const name = settings?.company?.name || 'Phoenix Enterprise';
  if (settings?.company?.logo) return <img src={settings.company.logo} alt={name} className="h-9 w-auto" />;
  const [first, ...rest] = name.split(' ');
  return (
    <span className={`flex items-center gap-2.5 font-display text-lg font-extrabold uppercase tracking-[0.14em] ${light ? 'text-paper' : 'text-ink'}`}>
      <span className="grid h-8 w-8 place-items-center bg-ember text-sm text-white">{first[0]}</span>
      <span>{first}<span className="font-medium opacity-70"> {rest.join(' ')}</span></span>
    </span>
  );
}

function Header({ settings, items }: { settings?: Settings; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  const cta = settings?.header;

  return (
    <header className={`sticky top-0 z-50 transition-colors ${scrolled || open ? 'bg-ink shadow-card' : 'bg-ink/95'}`}>
      <div className="container-site flex h-[72px] items-center justify-between">
        <Link to="/" aria-label={`${settings?.company?.name || 'Phoenix Enterprise'} home`}><Brand settings={settings} /></Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {items.map((item) => (
            <div key={item.url} className="group relative">
              <NavLink
                to={item.url}
                className={({ isActive }) => `block px-3.5 py-6 text-sm font-medium transition-colors hover:text-ember ${isActive ? 'text-ember' : 'text-paper/85'}`}
              >
                {item.label}
              </NavLink>
              {item.children?.length ? (
                <div className="invisible absolute left-0 top-full w-80 translate-y-1 border-t-2 border-ember bg-ink opacity-0 shadow-card transition group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  {item.children.map((c) => (
                    <Link key={c.url} to={c.url} className="block border-b border-white/5 px-5 py-3 text-sm text-paper/80 hover:bg-graphite hover:text-ember">{c.label}</Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          {cta?.ctaLabel && cta.ctaUrl && <SmartLink to={cta.ctaUrl} className="btn-primary ml-4 !py-2.5">{cta.ctaLabel}</SmartLink>}
        </nav>

        <button
          className="grid h-11 w-11 place-items-center text-paper lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={open ? 'M5 5l14 14M19 5L5 19' : 'M3 7h18M3 12h18M3 17h18'} />
          </svg>
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="max-h-[calc(100vh-72px)] overflow-y-auto border-t border-white/10 bg-ink lg:hidden">
          <ul className="container-site py-4">
            {items.map((item) => (
              <li key={item.url} className="border-b border-white/5">
                <Link to={item.url} className="block py-4 font-display text-lg font-semibold text-paper">{item.label}</Link>
              </li>
            ))}
            {cta?.ctaLabel && cta.ctaUrl && <li className="py-5"><SmartLink to={cta.ctaUrl} className="btn-primary w-full">{cta.ctaLabel}</SmartLink></li>}
          </ul>
        </nav>
      )}
    </header>
  );
}

function Footer({ settings, items }: { settings?: Settings; items: MenuItem[] }) {
  const c = settings?.contact;
  const year = new Date().getFullYear();
  return (
    <footer className="bg-ink text-paper/75">
      <div className="container-site grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <Brand settings={settings} />
          {settings?.footer?.blurb && <p className="mt-6 max-w-sm leading-relaxed">{settings.footer.blurb}</p>}
          {!!settings?.social?.length && (
            <ul className="mt-6 flex flex-wrap gap-5 text-sm">
              {settings.social.map((s) => <li key={s.url}><SmartLink to={s.url} className="hover:text-ember">{s.label}</SmartLink></li>)}
            </ul>
          )}
        </div>
        <nav aria-label="Footer" className="md:col-span-3">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-paper">Explore</h2>
          <ul className="space-y-3 text-sm">
            {items.map((i) => <li key={i.url}><Link to={i.url} className="hover:text-ember">{i.label}</Link></li>)}
          </ul>
        </nav>
        <div className="md:col-span-4">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-paper">Contact</h2>
          <address className="space-y-3 text-sm not-italic">
            {c?.address && <p className="whitespace-pre-line">{c.address}</p>}
            {c?.phones?.map((p) => <p key={p}><a href={`tel:${p.replace(/\s+/g, '')}`} className="hover:text-ember">{p}</a></p>)}
            {c?.emails?.map((e) => <p key={e}><a href={`mailto:${e}`} className="hover:text-ember">{e}</a></p>)}
            {c?.hours && <p>{c.hours}</p>}
            {!c?.address && !c?.phones?.length && !c?.emails?.length && <p><Link to="/contact" className="hover:text-ember">Get in touch</Link></p>}
          </address>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="container-site py-6 text-xs">© {year} {settings?.company?.name || 'Phoenix Enterprise'}. {settings?.footer?.legal}</p>
      </div>
    </footer>
  );
}

export default function Layout() {
  const { data, isLoading } = useSite();
  const { pathname } = useLocation();
  const settings = data?.settings;
  const ann = settings?.announcement;
  const [annClosed, setAnnClosed] = useState(false);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [pathname]);

  const name = settings?.company?.name || 'Phoenix Enterprise';
  const c = settings?.contact;
  // Site-wide LocalBusiness schema, kept in its own <script> so page-level SEO never clobbers it.
  const orgLd = settings ? JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'GeneralContractor',
    name,
    url: window.location.origin,
    ...(settings.company?.logo ? { logo: settings.company.logo } : {}),
    ...(c?.phones?.[0] ? { telephone: c.phones[0] } : {}),
    ...(c?.emails?.[0] ? { email: c.emails[0] } : {}),
    ...(c?.address ? { address: { '@type': 'PostalAddress', streetAddress: c.address.replace(/\n/g, ', ') } } : {}),
  }) : '';
  useEffect(() => {
    document.getElementById('org-jsonld')?.remove();
    if (!orgLd) return;
    const el = document.createElement('script');
    el.id = 'org-jsonld';
    el.type = 'application/ld+json';
    el.text = orgLd;
    document.head.appendChild(el);
  }, [orgLd]);

  const wa = c?.whatsapp?.replace(/[^\d]/g, '');

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-ember focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
      {ann?.enabled && ann.text && !annClosed && (
        <div className="bg-ember text-sm text-white">
          <div className="container-site flex items-center justify-between gap-4 py-2">
            <p>{ann.link ? <SmartLink to={ann.link} className="underline underline-offset-2">{ann.text}</SmartLink> : ann.text}</p>
            <button onClick={() => setAnnClosed(true)} aria-label="Dismiss announcement" className="px-2 text-lg leading-none">×</button>
          </div>
        </div>
      )}
      <Header settings={settings} items={data?.menus?.header ?? []} />
      <main id="main" className="flex-1">
        {isLoading ? <div className="container-site py-32"><div className="h-1 w-24 animate-pulse bg-ember" /></div> : <Outlet />}
      </main>
      <Footer settings={settings} items={data?.menus?.footer ?? []} />
      {wa && (
        <a
          href={`https://wa.me/${wa}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center bg-[#25D366] text-white shadow-card transition-transform hover:scale-105"
        >
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden="true">
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.6c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.8-.2 1.4z" />
          </svg>
        </a>
      )}
    </div>
  );
}
