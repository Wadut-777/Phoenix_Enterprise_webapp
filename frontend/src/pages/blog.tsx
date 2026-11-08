import { Link, useParams } from 'react-router-dom';
import { useBlog, useBlogs } from '../lib/api';
import { Breadcrumbs, Empty, ErrorState, Img, Loading, PageHero, RichText, useSeo } from '../components/ui';
import { NotFound } from './core';

const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

export function BlogList({ type }: { type: 'news' | 'insight' }) {
  const label = type === 'news' ? 'News & Updates' : 'Insights';
  const base = type === 'news' ? '/news' : '/insights';
  const { data, isLoading, error, refetch } = useBlogs(type);
  useSeo({ title: label, description: `${label} from Phoenix Enterprise.` });
  return (
    <>
      <PageHero eyebrow={type === 'news' ? 'Latest' : 'Blog'} title={label} />
      <Breadcrumbs trail={[{ label }]} />
      <section className="section">
        <div className="container-site">
          {isLoading ? <Loading /> : error ? <ErrorState onRetry={refetch} /> : !data?.items.length ? <Empty>Nothing published yet. Please check back soon.</Empty> : (
            <div className="grid gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
              {data.items.map((b) => (
                <Link key={b.slug} to={`${base}/${b.slug}`} className="group block">
                  <Img src={b.coverImage} className="aspect-[16/10] w-full" />
                  <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-concrete">{fmt(b.publishedAt)}</p>
                  <h2 className="mt-2 font-display text-xl font-bold group-hover:text-ember">{b.title}</h2>
                  {b.excerpt && <p className="mt-3 text-sm text-graphite/75">{b.excerpt}</p>}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export function BlogPost({ type }: { type: 'news' | 'insight' }) {
  const { slug = '' } = useParams();
  const { data: b, isLoading, error, refetch } = useBlog(slug);
  const label = type === 'news' ? 'News & Updates' : 'Insights';
  useSeo({
    seo: b?.seo, title: b?.title, description: b?.excerpt, image: b?.coverImage,
    jsonLd: b && { '@context': 'https://schema.org', '@type': 'Article', headline: b.title, datePublished: b.publishedAt, ...(b.author ? { author: { '@type': 'Person', name: b.author } } : {}) },
  });
  if (isLoading) return <Loading />;
  if (error?.status === 404) return <NotFound />;
  if (error || !b) return <ErrorState onRetry={refetch} />;
  return (
    <>
      <PageHero eyebrow={fmt(b.publishedAt)} title={b.title} intro={b.excerpt} image={b.coverImage} />
      <Breadcrumbs trail={[{ label, to: type === 'news' ? '/news' : '/insights' }, { label: b.title }]} />
      <article className="section"><div className="container-site max-w-3xl">
        {b.author && <p className="mb-8 text-sm text-concrete">By {b.author}</p>}
        <RichText lines={b.content} />
      </div></article>
    </>
  );
}
