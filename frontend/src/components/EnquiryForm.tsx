import { useState, type FormEvent } from 'react';
import { api, ApiError, useServices } from '../lib/api';

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'done' } | { kind: 'error'; message: string; fields?: Record<string, string[]> };

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.length ? <p className="mt-1 text-xs text-red-700">{errors[0]}</p> : null;
}

export function EnquiryForm({ defaultService = '', source = '', dark = false }: { defaultService?: string; source?: string; dark?: boolean }) {
  const { data } = useServices();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setStatus({ kind: 'sending' });
    try {
      await api('/enquiries', { method: 'POST', body: JSON.stringify({ ...Object.fromEntries(fd.entries()), source: source || window.location.pathname }) });
      form.reset();
      setStatus({ kind: 'done' });
    } catch (err) {
      const apiErr = err as ApiError;
      setStatus({ kind: 'error', message: apiErr.message || 'Could not send your enquiry.', fields: apiErr.fields });
    }
  }

  if (status.kind === 'done') {
    return (
      <div role="status" className="border border-ember bg-white p-8 text-ink">
        <p className="font-display text-2xl font-bold">Thank you.</p>
        <p className="mt-2 text-graphite/80">Your enquiry has been received. Our team will get back to you shortly.</p>
        <button className="btn-dark mt-6" onClick={() => setStatus({ kind: 'idle' })}>Send another enquiry</button>
      </div>
    );
  }

  const errors = status.kind === 'error' ? status.fields : undefined;
  const sending = status.kind === 'sending';
  return (
    <form onSubmit={onSubmit} noValidate className={`grid gap-5 sm:grid-cols-2 ${dark ? 'bg-white p-6 sm:p-8 text-ink' : ''}`}>
      {/* Honeypot: hidden from people, bots fill it in */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <div>
        <label className="label" htmlFor="enq-name">Name *</label>
        <input id="enq-name" name="name" required minLength={2} autoComplete="name" className="field" />
        <FieldError errors={errors?.name} />
      </div>
      <div>
        <label className="label" htmlFor="enq-email">Email *</label>
        <input id="enq-email" type="email" name="email" required autoComplete="email" className="field" />
        <FieldError errors={errors?.email} />
      </div>
      <div>
        <label className="label" htmlFor="enq-phone">Phone</label>
        <input id="enq-phone" name="phone" autoComplete="tel" className="field" />
      </div>
      <div>
        <label className="label" htmlFor="enq-company">Company</label>
        <input id="enq-company" name="company" autoComplete="organization" className="field" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="enq-service">Service of interest</label>
        <select id="enq-service" name="service" defaultValue={defaultService} className="field">
          <option value="">Select a service</option>
          {data?.items.map((s) => <option key={s.slug} value={s.title}>{s.title}</option>)}
          <option value="Other">Other</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="enq-message">Project details *</label>
        <textarea id="enq-message" name="message" required minLength={10} rows={5} className="field" />
        <FieldError errors={errors?.message} />
      </div>
      {status.kind === 'error' && <p role="alert" className="sm:col-span-2 text-sm text-red-700">{status.message}</p>}
      <div className="sm:col-span-2">
        <button type="submit" disabled={sending} className="btn-primary disabled:opacity-60">{sending ? 'Sending…' : 'Send enquiry'}</button>
      </div>
    </form>
  );
}
