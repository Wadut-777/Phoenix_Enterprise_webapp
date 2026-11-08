import { Link, useParams } from 'react-router-dom';
import { useIndustries, useIndustry } from '../lib/api';
import { ProjectCard, ServiceCard } from '../components/cards';
import { Arrow, Breadcrumbs, Empty, ErrorState, Img, Loading, PageHero, RichText, SectionHead, useSeo } from '../components/ui';
import { EnquiryForm } from '../components/EnquiryForm';
import { NotFound } from './core';

export function IndustriesPage() {
  const { data, isLoading, error, refetch } = useIndustries();
  useSeo({ title: 'Industries We Serve', description: 'Sectors served by Phoenix Enterprise.' });
  return (
    <>
      <PageHero eyebrow="Sectors" title="Industries we serve" intro="Our multidisciplinary capabilities support clients across a range of sectors." />
      <Breadcrumbs trail={[{ label: 'Industries' }]} />
      <section className="section">
        <div className="container-site">
          {isLoading ? <Loading /> : error ? <ErrorState onRetry={refetch} /> : !data?.items.length ? <Empty>No industries published yet.</Empty> : (
            <div className="grid gap-8 md:grid-cols-2">
              {data.items.map((i) => (
                <Link key={i.slug} to={`/industries/${i.slug}`} className="group block border border-stone bg-white transition-shadow hover:shadow-card">
                  <Img src={i.image} label={i.name} className="aspect-[16/9] w-full" />
                  <div className="p-8">
                    <h2 className="font-display text-2xl font-bold">{i.name}</h2>
                    <p className="mt-3 text-graphite/75">{i.summary}</p>
                    <span className="mt-5 inline-flex items-center gap-2 font-semibold text-ember">Explore <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export function IndustryDetail() {
  const { slug = '' } = useParams();
  const { data, isLoading, error, refetch } = useIndustry(slug);
  const i = data?.industry;
  useSeo({ seo: i?.seo, title: i?.name, description: i?.summary, image: i?.image });
  if (isLoading) return <Loading />;
  if (error?.status === 404) return <NotFound />;
  if (error || !data || !i) return <ErrorState onRetry={refetch} />;
  return (
    <>
      <PageHero eyebrow="Industry" title={i.name} intro={i.summary} image={i.image} />
      <Breadcrumbs trail={[{ label: 'Industries', to: '/industries' }, { label: i.name }]} />
      <section className="section">
        <div className="container-site grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7"><RichText lines={i.intro} /></div>
          <aside className="lg:col-span-5">
            <div className="bg-ink p-8 text-paper">
              <h2 className="font-display text-xl font-bold">Capabilities</h2>
              <ul className="mt-5 space-y-3 text-paper/80">{i.capabilities.map((c) => <li key={c} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 bg-ember" />{c}</li>)}</ul>
            </div>
          </aside>
        </div>
      </section>
      {!!data.services.length && (
        <section className="section bg-white"><div className="container-site">
          <SectionHead eyebrow="Services" heading="How we support this sector" />
          <div className="grid gap-px bg-stone sm:grid-cols-2 lg:grid-cols-3 [&>*]:bg-white">{data.services.map((s) => <ServiceCard key={s.slug} s={s} />)}</div>
        </div></section>
      )}
      {!!data.projects.length && (
        <section className="section"><div className="container-site">
          <SectionHead eyebrow="Experience" heading="Projects in this sector" />
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">{data.projects.map((p) => <ProjectCard key={p._id} p={p} />)}</div>
        </div></section>
      )}
      <section className="section bg-ink text-paper"><div className="container-site grid gap-12 lg:grid-cols-2">
        <h2 className="h-section">Discuss your {i.name.toLowerCase()} project</h2>
        <EnquiryForm dark source={`industry:${i.slug}`} />
      </div></section>
    </>
  );
}
