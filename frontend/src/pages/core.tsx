import { Link, useParams } from 'react-router-dom';
import { usePage } from '../lib/api';
import { BlockRenderer, FaqList } from '../components/blocks';
import { Breadcrumbs, ErrorState, Loading, PageHero, SectionHead, useSeo } from '../components/ui';
import { EnquiryForm } from '../components/EnquiryForm';
import { useSite } from '../lib/api';

export function NotFound() {
  useSeo({ title: 'Page not found', seo: { noIndex: true } });
  return (
    <div className="container-site py-32">
      <p className="eyebrow">Error 404</p>
      <h1 className="font-display text-5xl font-extrabold sm:text-7xl">Page not found</h1>
      <p className="mt-6 max-w-lg text-lg text-graphite/75">The page you are looking for does not exist or has moved.</p>
      <Link to="/" className="btn-primary mt-10">Back to home</Link>
    </div>
  );
}

/** Renders any CMS page (home, about, legal pages, new pages) from its block layout. */
export function DynamicPage({ slug: fixed }: { slug?: string }) {
  const params = useParams();
  const slug = fixed || params.slug || 'home';
  const { data, isLoading, error, refetch } = usePage(slug);
  useSeo({ seo: data?.seo, title: data?.title });
  if (isLoading) return <Loading />;
  if (error?.status === 404) return <NotFound />;
  if (error) return <ErrorState onRetry={refetch} />;
  if (!data) return null;
  const hasHero = data.blocks[0]?.type === 'hero';
  return (
    <>
      {!hasHero && <PageHero title={data.title} />}
      {slug !== 'home' && <Breadcrumbs trail={[{ label: data.title }]} />}
      <BlockRenderer blocks={data.blocks} />
    </>
  );
}

export function Faqs() {
  useSeo({ title: 'FAQs', description: 'Frequently asked questions about Phoenix Enterprise.' });
  return (
    <>
      <PageHero eyebrow="Help" title="Frequently asked questions" />
      <Breadcrumbs trail={[{ label: 'FAQs' }]} />
      <section className="section"><div className="container-site max-w-4xl"><FaqList /></div></section>
    </>
  );
}

export function Contact() {
  const { data } = useSite();
  const c = data?.settings.contact;
  useSeo({ title: 'Contact Us', description: 'Get in touch with Phoenix Enterprise to discuss your project.' });
  const wa = c?.whatsapp?.replace(/[^\d]/g, '');
  const hasDetails = c?.address || c?.phones?.length || c?.emails?.length || wa || c?.hours;
  return (
    <>
      <PageHero eyebrow="Contact" title="Let's discuss your project" intro="Tell us what you are planning and our team will respond with the next steps." />
      <Breadcrumbs trail={[{ label: 'Contact' }]} />
      <section className="section">
        <div className="container-site grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <SectionHead heading="Send an enquiry" />
            <EnquiryForm source="contact-page" />
          </div>
          <aside className="space-y-8 lg:col-span-5">
            {hasDetails ? (
              <div className="space-y-6 border border-stone bg-white p-8">
                {c?.address && <div><h2 className="label">Office</h2><p className="whitespace-pre-line">{c.address}</p></div>}
                {!!c?.phones?.length && <div><h2 className="label">Phone</h2>{c.phones.map((p) => <p key={p}><a className="hover:text-ember" href={`tel:${p.replace(/\s+/g, '')}`}>{p}</a></p>)}</div>}
                {!!c?.emails?.length && <div><h2 className="label">Email</h2>{c.emails.map((e) => <p key={e}><a className="hover:text-ember" href={`mailto:${e}`}>{e}</a></p>)}</div>}
                {c?.hours && <div><h2 className="label">Hours</h2><p>{c.hours}</p></div>}
                {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="btn-dark w-full">Chat on WhatsApp</a>}
              </div>
            ) : (
              <p className="border border-dashed border-concrete/50 p-8 text-sm text-concrete">Contact details have not been added yet. They can be set in the CMS under Website Settings.</p>
            )}
            {c?.mapEmbedUrl && (
              <iframe
                title="Office location"
                src={c.mapEmbedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-80 w-full border-0"
                allowFullScreen
              />
            )}
          </aside>
        </div>
      </section>
    </>
  );
}
