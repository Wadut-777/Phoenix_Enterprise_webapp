import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError, useJob, useJobs } from '../lib/api';
import { Arrow, Breadcrumbs, Empty, ErrorState, Loading, PageHero, RichText, SectionHead, useSeo } from '../components/ui';
import { NotFound } from './core';

export function CareersPage() {
  const { data, isLoading, error, refetch } = useJobs();
  useSeo({ title: 'Careers', description: 'Current openings at Phoenix Enterprise.' });
  return (
    <>
      <PageHero eyebrow="Careers" title="Build your career with us" intro="Join a multidisciplinary team delivering construction, interiors and engineering projects." />
      <Breadcrumbs trail={[{ label: 'Careers' }]} />
      <section className="section">
        <div className="container-site max-w-4xl">
          <SectionHead heading="Current openings" />
          {isLoading ? <Loading /> : error ? <ErrorState onRetry={refetch} /> : !data?.items.length ? <Empty>No openings right now. Please check back soon.</Empty> : (
            <ul className="divide-y divide-stone border-y border-stone">
              {data.items.map((j) => (
                <li key={j.slug}>
                  <Link to={`/careers/${j.slug}`} className="group flex items-center justify-between gap-6 py-6">
                    <div>
                      <h3 className="font-display text-xl font-bold group-hover:text-ember">{j.title}</h3>
                      <p className="mt-1 text-sm text-concrete">{[j.department, j.location, j.employmentType].filter((v) => v && v !== 'To be updated').join(' · ')}</p>
                    </div>
                    <Arrow className="h-5 w-5 shrink-0 text-ember transition-transform group-hover:translate-x-1" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

function ApplyForm({ jobSlug }: { jobSlug: string }) {
  const [state, setState] = useState<{ kind: 'idle' | 'sending' | 'done' | 'error'; message?: string; fields?: Record<string, string[]> }>({ kind: 'idle' });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set('jobSlug', jobSlug);
    const file = fd.get('resume') as File | null;
    if (!file || !file.size) return setState({ kind: 'error', message: 'Please attach your resume.' });
    if (file.size > 5 * 1024 * 1024) return setState({ kind: 'error', message: 'Resume must be 5 MB or smaller.' });
    setState({ kind: 'sending' });
    try {
      await api('/careers/apply', { method: 'POST', body: fd });
      form.reset();
      setState({ kind: 'done' });
    } catch (err) {
      const a = err as ApiError;
      setState({ kind: 'error', message: a.message, fields: a.fields });
    }
  }

  if (state.kind === 'done') {
    return <div role="status" className="border border-ember bg-white p-8"><p className="font-display text-2xl font-bold">Application received.</p><p className="mt-2 text-graphite/80">Thank you for applying. We will be in touch if your profile matches.</p></div>;
  }
  const f = state.fields;
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
      <div className="absolute -left-[9999px]" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div><label className="label" htmlFor="ap-name">Full name *</label><input id="ap-name" name="name" required autoComplete="name" className="field" />{f?.name && <p className="mt-1 text-xs text-red-700">{f.name[0]}</p>}</div>
      <div><label className="label" htmlFor="ap-email">Email *</label><input id="ap-email" type="email" name="email" required autoComplete="email" className="field" />{f?.email && <p className="mt-1 text-xs text-red-700">{f.email[0]}</p>}</div>
      <div className="sm:col-span-2"><label className="label" htmlFor="ap-phone">Phone</label><input id="ap-phone" name="phone" autoComplete="tel" className="field" /></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="ap-note">Cover note</label><textarea id="ap-note" name="coverNote" rows={4} className="field" /></div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="ap-resume">Resume (PDF, DOC or DOCX, max 5 MB) *</label>
        <input id="ap-resume" type="file" name="resume" required accept=".pdf,.doc,.docx" className="field file:mr-4 file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:text-paper" />
      </div>
      {state.kind === 'error' && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{state.message}</p>}
      <div className="sm:col-span-2"><button type="submit" disabled={state.kind === 'sending'} className="btn-primary disabled:opacity-60">{state.kind === 'sending' ? 'Submitting…' : 'Submit application'}</button></div>
    </form>
  );
}

export function JobDetail() {
  const { slug = '' } = useParams();
  const { data: j, isLoading, error, refetch } = useJob(slug);
  useSeo({ title: j?.title, description: j?.summary });
  if (isLoading) return <Loading />;
  if (error?.status === 404) return <NotFound />;
  if (error || !j) return <ErrorState onRetry={refetch} />;
  return (
    <>
      <PageHero eyebrow="Careers" title={j.title} intro={j.summary} />
      <Breadcrumbs trail={[{ label: 'Careers', to: '/careers' }, { label: j.title }]} />
      <section className="section">
        <div className="container-site grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <p className="mb-8 text-sm text-concrete">{[j.department, j.location, j.employmentType].filter((v) => v && v !== 'To be updated').join(' · ')}</p>
            {!!j.responsibilities.length && <><h2 className="font-display text-2xl font-bold">Responsibilities</h2><RichText className="mt-4 !text-base" lines={j.responsibilities.map((r) => `- ${r}`)} /></>}
            {!!j.requirements.length && <><h2 className="mt-10 font-display text-2xl font-bold">Requirements</h2><RichText className="mt-4 !text-base" lines={j.requirements.map((r) => `- ${r}`)} /></>}
          </div>
          <div className="lg:col-span-6"><h2 className="mb-6 font-display text-2xl font-bold">Apply now</h2><ApplyForm jobSlug={j.slug} /></div>
        </div>
      </section>
    </>
  );
}
