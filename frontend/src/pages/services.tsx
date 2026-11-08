import { Link, useParams } from 'react-router-dom';
import { useServices, useService } from '../lib/api';
import { ServiceCard, ProjectCard } from '../components/cards';
import { Breadcrumbs, Empty, ErrorState, Icon, Img, Loading, PageHero, RichText, SectionHead, useSeo } from '../components/ui';
import { EnquiryForm } from '../components/EnquiryForm';
import { NotFound } from './core';

export function ServicesPage() {
  const { data, isLoading, error, refetch } = useServices();
  useSeo({ title: 'Services', description: 'Construction, interiors, MEP, ELV, telecom, smart metering, AMC and technical staffing from Phoenix Enterprise.' });
  return (
    <>
      <PageHero eyebrow="What we do" title="Our services" intro="Multidisciplinary construction, engineering and interior solutions delivered by one coordinated team." />
      <Breadcrumbs trail={[{ label: 'Services' }]} />
      <section className="section">
        <div className="container-site">
          {isLoading ? <Loading /> : error ? <ErrorState onRetry={refetch} /> : !data?.items.length ? <Empty>No services published yet.</Empty> : (
            <div className="grid gap-px bg-stone sm:grid-cols-2 lg:grid-cols-3 [&>*]:bg-white">
              {data.items.map((s, i) => <ServiceCard key={s.slug} s={s} index={i} />)}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export function ServiceDetail() {
  const { slug = '' } = useParams();
  const { data, isLoading, error, refetch } = useService(slug);
  const s = data?.service;
  useSeo({ seo: s?.seo, title: s?.title, description: s?.summary, image: s?.heroImage });
  if (isLoading) return <Loading />;
  if (error?.status === 404) return <NotFound />;
  if (error || !data || !s) return <ErrorState onRetry={refetch} />;
  return (
    <>
      <PageHero eyebrow="Service" title={s.title} intro={s.summary} image={s.heroImage} />
      <Breadcrumbs trail={[{ label: 'Services', to: '/services' }, { label: s.title }]} />

      <section className="section">
        <div className="container-site grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="eyebrow">Overview</p>
            <RichText lines={s.intro} />
            {!!s.scope.length && (
              <>
                <h2 className="mt-14 font-display text-3xl font-bold">Scope of services</h2>
                <ul className="mt-6 divide-y divide-stone border-y border-stone">
                  {s.scope.map((x) => <li key={x} className="flex gap-4 py-4"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 bg-ember" />{x}</li>)}
                </ul>
              </>
            )}
          </div>
          <aside className="lg:col-span-5">
            <div className="bg-ink p-8 text-paper">
              <span className="text-ember"><Icon name={s.icon} className="h-10 w-10" /></span>
              <h2 className="mt-6 font-display text-xl font-bold">Key capabilities</h2>
              <ul className="mt-5 space-y-3 text-paper/80">
                {s.capabilities.map((c) => <li key={c} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 bg-ember" />{c}</li>)}
              </ul>
            </div>
            <Img src={s.heroImage} alt={s.title} className="mt-6 aspect-[4/3] w-full" />
          </aside>
        </div>
      </section>

      {!!s.methodology.length && (
        <section className="section bg-white">
          <div className="container-site">
            <SectionHead eyebrow="How we deliver" heading="Execution methodology" />
            <ol className="grid gap-px bg-stone md:grid-cols-5 [&>*]:bg-white">
              {s.methodology.map((m, i) => (
                <li key={m.title} className="p-6">
                  <span className="font-display text-3xl font-extrabold text-ember">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="mt-3 font-display font-bold">{m.title}</h3>
                  <p className="mt-2 text-sm text-graphite/75">{m.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {!!data.projects.length && (
        <section className="section">
          <div className="container-site">
            <SectionHead eyebrow="Experience" heading="Relevant projects" />
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">{data.projects.map((p) => <ProjectCard key={p._id} p={p} />)}</div>
          </div>
        </section>
      )}

      {!!data.related.length && (
        <section className="section bg-white">
          <div className="container-site">
            <SectionHead eyebrow="Also from us" heading="Related services" />
            <div className="grid gap-px bg-stone sm:grid-cols-2 [&>*]:bg-white">{data.related.map((r) => <ServiceCard key={r.slug} s={r} />)}</div>
          </div>
        </section>
      )}

      <section className="section bg-ink text-paper">
        <div className="container-site grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="h-section">Enquire about {s.title}</h2>
            <p className="mt-6 max-w-lg text-lg text-paper/75">Share a few details and we will come back to you. Prefer to browse first? <Link to="/projects" className="text-ember underline">See our projects</Link>.</p>
          </div>
          <EnquiryForm dark defaultService={s.title} source={`service:${s.slug}`} />
        </div>
      </section>
    </>
  );
}
