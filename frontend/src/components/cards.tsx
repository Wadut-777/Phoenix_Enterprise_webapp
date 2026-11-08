import { Link } from 'react-router-dom';
import { Arrow, Icon, Img } from './ui';
import type { Project, Service } from '../lib/api';

export function ServiceCard({ s, index }: { s: Service; index?: number }) {
  return (
    <Link
      to={`/services/${s.slug}`}
      className="group relative flex h-full flex-col border border-stone bg-white p-7 transition-all hover:-translate-y-1 hover:shadow-card"
    >
      <div className="mb-8 flex items-start justify-between">
        <span className="text-ember"><Icon name={s.icon} className="h-9 w-9" /></span>
        {index !== undefined && <span className="font-display text-sm font-bold text-stone">{String(index + 1).padStart(2, '0')}</span>}
      </div>
      <h3 className="font-display text-xl font-bold leading-snug">{s.title}</h3>
      {s.summary && <p className="mt-3 flex-1 text-sm leading-relaxed text-graphite/75">{s.summary}</p>}
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-ember">
        Learn more <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
      <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-ember transition-all duration-300 group-hover:w-full" />
    </Link>
  );
}

export function ProjectCard({ p, tall = false }: { p: Project; tall?: boolean }) {
  return (
    <Link to={`/projects/${p.slug}`} className="group block">
      <div className="relative overflow-hidden">
        <Img
          src={p.coverImage}
          alt={p.title}
          label={p.isPlaceholder ? 'Sample image' : undefined}
          className={`w-full transition-transform duration-700 group-hover:scale-105 ${tall ? 'aspect-[4/5]' : 'aspect-[4/3]'}`}
        />
        <div className="absolute left-0 top-0 flex gap-px text-[11px] font-semibold uppercase tracking-wider">
          {p.category && <span className="bg-ink px-3 py-1.5 text-paper">{p.category.name}</span>}
          <span className={`px-3 py-1.5 ${p.projectStatus === 'Ongoing' ? 'bg-ember text-white' : 'bg-paper text-ink'}`}>{p.projectStatus}</span>
        </div>
      </div>
      <div className="pt-5">
        <h3 className="font-display text-xl font-bold transition-colors group-hover:text-ember">{p.title}</h3>
        <p className="mt-1 text-sm text-concrete">
          {[p.client, p.location].filter((v) => v && v !== 'To be updated').join(' · ') || (p.isPlaceholder ? 'Sample project · details to be updated' : '')}
        </p>
        {p.summary && <p className="mt-3 line-clamp-2 text-sm text-graphite/75">{p.summary}</p>}
      </div>
    </Link>
  );
}
